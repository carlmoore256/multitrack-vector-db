import { IMultitrackRecording, IRecordingDownloadableResource, RecordingDownloadableResourceType } from "./models/cambridge-models.js";
import DatabaseClient from "./database/dbClient.js";
import { generateId } from "./utils/utils.js";
import axios from 'axios'; // or use any other HTTP client
import path from "path";
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { Debug } from "./utils/Debug.js";
import { unzipFile } from "./unzip.js";
import { STORAGE_ROOT } from "./definitions.js";
import { unzipMultitracks } from "./unzip.js";

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

    public maxConcurrent = 3;

    public defaultTTL = 5 * 60 * 1000; // 5 minutes

    private watchdog: NodeJS.Timeout | null = null;

    private async startWatchdog() {
        if (!this.watchdog) {
            Debug.log('Starting watchdog');
            this.watchdog = setInterval(() => {
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
            });
        }
    }

    private async downloadResource(download: IDownloadJob) {
        // check to see if the download can proceed
        if (this.queue.length > this.maxConcurrent) {
            Debug.log(`Max concurrent downloads reached (${this.maxConcurrent})`);
            setTimeout(() => {
                this.downloadResource(download);
            }, 1000);
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
                download.onComplete(download);
                if (this.watchdog && this.queue.length === 0) {
                    clearInterval(this.watchdog);
                    this.watchdog = null;
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

    public addToQueue(resource: IRecordingDownloadableResource, callbacks: DownloadCallbacks): string {
        const downloadPath = path.join(STORAGE_ROOT, resource.filename);

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
        this.downloadResource(download);
        return token;
    }
}

export async function downloadMultitrackRecording(
        dbClient: DatabaseClient,
        recording : IMultitrackRecording, 
        type : RecordingDownloadableResourceType | "all" = "multitrack") 
{
    const manager = DownloadManager.Instance;
    const callbacks : DownloadCallbacks = {
        onComplete: async (job : IDownloadJob) => {
            const audioFiles = await unzipMultitracks(recording, job);
            audioFiles.forEach(a => dbClient.insert('audio_file', a));
        },
        onError: (e) => {
            console.error(`Error downloading file: ${e}`);
        },
        onProgress: (progress) => {
            console.log(`Download progress: ${progress}`);
        }
    }

    var query = `
    SELECT
        id, type, filename, url, bytes
    FROM
        multitrack_recording_download
    WHERE
        recording_id = ${recording.id}
    `
    if (type !== "all") query += `AND type = ${type}`;

    const results = await dbClient.query(query);
    if (!results) throw new Error("No results found");

    for (let resource of results) {
        if (!resource.url) continue;
        Debug.log(`Downloading ${resource.url}`);
        manager.addToQueue(resource, callbacks);
    }
}
            
// make sure to have the most up to date info, because there could be
// concurrent downloads
// const currentEntry = await dbClient.getById('multitrack_recording', recording.id);
// await dbClient.upsert('multitrack_recording', {
//     id: recording.id,
//     files: [job.downloadPath, ...currentEntry.files]
//     // downloaded: true
// })

// we need to wait to unzip the file until all the files are downloaded
// await dbClient.insert('audio_file', {
//     id: generateId(),
//     // uri: downloadPath,
//     // name: resource.filename,
//     tags: null,
//     bytes: job.totalBytes,
//     metadata: {},
//     recording_id: recording.id
// })