import { IMultitrackRecording, IRecordingDownloadableResource, RecordingDownloadableResourceType } from "../models/cambridge-models.js";
import DatabaseClient from "../database/DatabaseClient.js";
import { generateId } from "../utils/utils.js";
import axios from 'axios'; // or use any other HTTP client
import path from "path";
import { createWriteStream, existsSync, mkdirSync, copyFileSync, copyFile, unlinkSync, chmodSync } from 'fs';
import { Debug } from "../utils/Debug.js";
import { unzipFile } from "../datastore/unzip.js";
import { STORAGE_ROOT, DOWNLOAD_TEMP_DIR } from "../definitions.js";
import { unzipMultitracks } from "../datastore/unzip.js";
import { getRecordingDestinationPath } from "../Recording.js";
import { IAudioFile } from "../models/audio-models.js";

export interface DownloadCallbacks {
    onComplete: (download: IDownloadJob) => void;
    onError: (error: string) => void;
    onProgress: (progress: number) => void;
}

export interface IDownloadJob {
    token: string;
    resource: IRecordingDownloadableResource;
    downloadPath: string;
    totalBytes: number;
    downloadedBytes: number;
    progress: number;
    status: string;
    error: string | null;
    cancel: boolean;
    ttl: number;
    lastUpdated: Date;
    onComplete: (download: any) => void;
    onError: (error: string) => void;
    onProgress: (progress: number) => void;
}

// handles the state of the download of multitrack recoding files
export class DownloadManager {

    private static _instance: DownloadManager | null = null;
    
    public static get Instance() {
        if (!this._instance) {
            this._instance = new DownloadManager();
        }
        return this._instance;
    }

    public queue: IDownloadJob[] = [];

    public active : IDownloadJob[] = [];

    public maxConcurrent = 2;

    public defaultTTL = 5 * 60 * 1000; // 5 minutes

    private static watchdog: NodeJS.Timeout | null = null;

    private async startWatchdog() {
        if (!DownloadManager.watchdog) {
            Debug.log('Starting watchdog');
            DownloadManager.watchdog = setInterval(() => {
                this.queue.forEach((download) => {
                    if (download.status === 'failed') {
                        this.downloadResource(download);
                    }
                    if (download.status === 'completed') {
                        this.queue = this.queue.filter(d => d !== download);
                    }
                    if (download.ttl && download.lastUpdated) {
                        const now = new Date();
                        const elapsed = now.getTime() - download.lastUpdated.getTime();
                        if (elapsed > download.ttl) {
                            download.cancel = true;
                            download.status = 'failed';
                            download.error = 'Download timed out';
                            download.onError('Download timed out');
                        }
                    }
                });
            }, 1000);
        }
    }
    
    private processQueue() {
        if (this.queue.length > 0 && this.active.length < this.maxConcurrent) {
            const nextJob = this.queue.shift();  // take the next job from the queue
            if (nextJob) {
                this.active.push(nextJob);  // add it to the active jobs
                this.downloadResource(nextJob);  // and start downloading
            }
        }
    }

    private async downloadResource(download: IDownloadJob) {
        // check to see if the download can proceed
        if (this.queue.length > this.maxConcurrent) {
            // Debug.log(`Max concurrent downloads reached (${this.maxConcurrent})`);
            setTimeout(() => {
                this.downloadResource(download);
            }, 5000);
            return;
        }

        try {
            this.startWatchdog();
            const response = await axios.get(download.resource.url, {
                responseType: 'stream'
            });
            const writer = createWriteStream(download.downloadPath);
            response.data.pipe(writer);
            let totalBytes = parseInt(response.headers['content-length'], 10);
            download.totalBytes = totalBytes;
            response.data.on('data', (chunk: Buffer) => {
                if (download.cancel) {
                    writer.close();
                    Debug.log('Download cancelled');
                    return;
                }
                if (download.status == 'pending') {
                    download.status = 'downloading';
                }
                download.lastUpdated = new Date();
                const lastSize = download.downloadedBytes;
                const currentSize = download.downloadedBytes + chunk.length;

                download.downloadedBytes += chunk.length;
                let progress = Math.round(download.downloadedBytes / totalBytes * 100);
                download.progress = progress;
                download.onProgress(progress);
            });

            writer.on('finish', () => {
                download.status = 'completed';
                writer.end();
                modifyFilePermissions(download.downloadPath, 0o644);
                
                this.active = this.active.filter(job => job !== download);  // remove the job from the active jobs
                this.processQueue();  // process the queue again after a job has finished


                download.onComplete(download);
                if (DownloadManager.watchdog && this.queue.length === 0) {
                    clearInterval(DownloadManager.watchdog);
                    DownloadManager.watchdog = null;
                }
            });

            writer.on('error', (error: any) => {
                download.status = 'failed';
                download.error = error.message;
                download.onError(error.message);
            });

        } catch (error : any) {
            download.status = 'failed';
            download.error = error.message;
            download.onError(error.message);
        }
    }

    // public void updateBandwidthUsage()

    public addToQueue(resource: IRecordingDownloadableResource, callbacks: DownloadCallbacks, downloadPath? : string): string {
        downloadPath = downloadPath ?? path.join(DOWNLOAD_TEMP_DIR, resource.filename);

        const token = generateId();
        const error: string[] = [];
        // this.Queue.
        const download: IDownloadJob = ({
            token,
            resource,
            downloadPath,
            totalBytes: resource.bytes || 0,
            downloadedBytes: 0,
            progress: 0,
            status: "queued",
            error: null,
            cancel: false,
            ttl: this.defaultTTL,
            lastUpdated: new Date(),
            onComplete: async (job : IDownloadJob) => {
                console.log(`Download completed: ${downloadPath}`);
                this.queue = this.queue.filter(d => d !== download);               
                callbacks.onComplete(job);
            },
            onError: (e) => {
                console.error(`Error downloading file: ${error}`);
                callbacks?.onError(e);
            },
            onProgress: (progress) => {
                console.log(`Download progress: ${progress}`);
                callbacks?.onProgress(progress);
            }
        });
        this.queue.push(download);
        // this.downloadResource(download);
        this.processQueue();
        return token;
    }
}

function modifyFilePermissions(filePath : string, permissions : any = 0o644) {
    const res = chmodSync(filePath, permissions);
  }
  