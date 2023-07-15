import { IMultitrackRecording, IRecordingDownloadableResource, RecordingDownloadableResourceType } from "../models/cambridge-models.js";
import DatabaseClient from "../database/DatabaseClient.js";
import { generateId } from "../utils/utils.js";
import axios from 'axios'; // or use any other HTTP client
import path from "path";
import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs';
import { Debug } from "../utils/Debug.js";
import { unzipFile } from "../datastore/unzip.js";
import { STORAGE_ROOT, DOWNLOAD_TEMP_DIR } from "../definitions.js";
import { unzipAudioFiles } from "../datastore/unzip.js";
import { getRecordingDestinationPath } from "../parsing/MultitrackRecording.js";
import { IAudioFile } from "../models/audio-models.js";
import { checkMakeDir } from "../utils/files.js";
import { JobObserver } from "./DownloadJob.js";

import { DownloadJob, DownloadCallbacks } from "./DownloadJob.js";


export interface IDownloadQueueParams {
    url: string;
    callbacks: DownloadCallbacks;
    metadata?: any;
    filename?: string;
    downloadPath?: string;
    totalBytes?: number;
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

    public pendingJobs: DownloadJob[] = [];

    public activeJobs : DownloadJob[] = [];

    public onJobStartObservers : JobObserver[] = [];
    public onJobProgressObservers : JobObserver[] = [];
    public onJobCompleteObservers : JobObserver[] = [];

    public maxConcurrent = 3;

    public defaultTTL = 5 * 60 * 1000; // 5 minutes

    public watchdogInterval = 1000;

    private static watchdog: NodeJS.Timeout | null = null;

    private constructor(private downloadRoot : string = DOWNLOAD_TEMP_DIR) {
        checkMakeDir(downloadRoot);
        this.startWatchdog();
    }

    public getDownloadJob(token: string) : DownloadJob | null {
        return this.activeJobs.find(d => d.token === token) || null;
    }

    private startWatchdog() {
        if (DownloadManager.watchdog) return;

        Debug.log('Starting watchdog');

        DownloadManager.watchdog = setInterval(() => {
            this.processQueue();
            // evaluate if the any active download has timed out
            this.activeJobs.forEach(d => d.evaluateTimeout());
            // filter out any completed or failed downloads
            this.activeJobs = this.activeJobs.filter(d => d.status !== 'failed' && d.status !== 'completed');

        }, this.watchdogInterval);
    }
    
    private processQueue() {
        if (this.pendingJobs.length > 0 && this.activeJobs.length < this.maxConcurrent) {
            const nextJob = this.pendingJobs.shift();  // take the next job from the queue
            if (nextJob) {
                nextJob.start();
                this.activeJobs.push(nextJob);  // add it to the active jobs
                this.onJobStartObservers.forEach(o => o(nextJob));
            }
        }
    }

    // public void updateBandwidthUsage()

    public addToQueue(params : IDownloadQueueParams) : DownloadJob {       
        // downloadPath = downloadPath ?? path.join(this.downloadRoot, resource.filename);
        let { url, callbacks, filename, downloadPath, totalBytes } = params;
        filename = filename || generateId();
        downloadPath = downloadPath ?? path.join(this.downloadRoot, filename);


        const dlCallbacks : DownloadCallbacks = {
            onComplete: (job) => {
                this.onJobCompleteObservers.forEach(o => o(job));
                callbacks.onComplete(job);
            },
            onProgress: (job) => {
                this.onJobProgressObservers.forEach(o => o(job));
                callbacks.onProgress(job);
            },
            onError: (error) => {
                callbacks.onError(error);
            }
        }
        
        const job = new DownloadJob(url, downloadPath, dlCallbacks);

        this.pendingJobs.push(job);

        this.processQueue();
        
        return job;
    }
}








// private async downloadResource(download: IDownloadJob) {
//     // check to see if the download can proceed
//     if (this.queue.length > this.maxConcurrent) {
//         // Debug.log(`Max concurrent downloads reached (${this.maxConcurrent})`);
//         setTimeout(() => {
//             this.downloadResource(download);
//         }, 5000);
//         return;
//     }

//     try {
//         this.startWatchdog();
//         const response = await axios.get(download.url, {
//             responseType: 'stream'
//         });
//         const writer = createWriteStream(download.downloadPath);
//         response.data.pipe(writer);
//         let totalBytes = parseInt(response.headers['content-length'], 10);
//         download.totalBytes = totalBytes;
        
//         response.data.on('data', (chunk: Buffer) => {
//             if (download.cancel) {
//                 writer.close();
//                 Debug.log('Download cancelled');
//                 return;
//             }
//             if (download.status == 'pending') {
//                 download.status = 'downloading';
//             }
//             download.lastUpdated = new Date();
//             const lastSize = download.downloadedBytes;
//             const currentSize = download.downloadedBytes + chunk.length;

//             download.downloadedBytes += chunk.length;
//             let progress = Math.round(download.downloadedBytes / download.totalBytes * 100);
//             download.progress = progress;
//             download.onProgress(progress);
//         });

//         writer.on('finish', () => {
//             download.status = 'completed';
//             writer.end();
//             modifyFilePermissions(download.downloadPath, 0o644);
            
//             this.active = this.active.filter(job => job !== download);  // remove the job from the active jobs
//             this.processQueue();  // process the queue again after a job has finished


//             download.onComplete(download);
//             if (DownloadManager.watchdog && this.queue.length === 0) {
//                 clearInterval(DownloadManager.watchdog);
//                 DownloadManager.watchdog = null;
//             }
//         });

//         writer.on('error', (error: any) => {
//             download.status = 'failed';
//             download.error = error.message;
//             download.onError(error.message);
//         });

//     } catch (error : any) {
//         download.status = 'failed';
//         download.error = error.message;
//         download.onError(error.message);
//     }
// }
// if (download.status === 'failed') {
//     // this.downloadResource(download);
// }
// if (download.status === 'completed') {
//     this.queue = this.queue.filter(d => d !== download);
// }
// if (download.ttl && download.lastUpdated) {
//     const now = new Date();
//     const elapsed = now.getTime() - download.lastUpdated.getTime();
//     if (elapsed > download.ttl) {
//         download.cancel = true;
//         download.status = 'failed';
//         download.error = 'Download timed out';
//         download.onError('Download timed out');
//     }
// }

// const download: IDownloadJob = ({
//     url,
//     token,
//     downloadPath,
//     totalBytes: totalBytes || 1,
//     downloadedBytes: 0,
//     progress: 0,
//     status: "queued",
//     error: null,
//     cancel: false,
//     ttl: this.defaultTTL,
//     lastUpdated: new Date(),
//     onComplete: async (job : IDownloadJob) => {
//         console.log(`Download completed: ${downloadPath}`);
//         this.queue = this.queue.filter(d => d !== download);               
//         callbacks.onComplete(job);
//     },
//     onError: (e) => {
//         console.error(`Error downloading file: ${error}`);
//         callbacks?.onError(e);
//     },
//     onProgress: (progress) => {
//         console.log(`Download progress: ${progress}`);
//         callbacks?.onProgress(progress);
//     }
// });
// this.queue.push(download);

// export interface DownloadCallbacks {
//     onComplete: (download: IDownloadJob) => void;
//     onError: (error: string) => void;
//     onProgress: (progress: number) => void;
// }

// export interface IDownloadJob {
//     url: string;
//     token: string;
//     downloadPath: string;
//     totalBytes: number;
//     downloadedBytes: number;
//     progress: number;
//     status: string;
//     error: string | null;
//     cancel: boolean;
//     ttl: number;
//     lastUpdated: Date;
//     onComplete: (download: any) => void;
//     onError: (error: string) => void;
//     onProgress: (progress: number) => void;
// }