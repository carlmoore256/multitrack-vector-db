import { generateId } from "../utils/utils.js";
import axios from 'axios';
import { createWriteStream, existsSync, mkdirSync, chmodSync, WriteStream } from 'fs';
import { modifyFilePermissions } from "../utils/files.js";
import Debug from "../utils/Debug.js";

export interface DownloadCallbacks {
    onComplete: (download: DownloadJob) => void;
    onProgress: (download: DownloadJob) => void;
    onError: (error: string) => void;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export type DownloadStatus = 'pending' | 'started' | 'downloading' | 'completed' | 'failed';


export type JobObserver = (job: DownloadJob) => void;


export class DownloadJob {

    url: string;
    token: string;
    downloadPath: string;
    totalBytes: number | null = null;
    downloadedBytes: number = 0;
    progress: number = 0;
    status: DownloadStatus = 'pending';
    error: string | null = null;
    ttl: number = DEFAULT_TTL;
    lastUpdated: Date | null = null;
    callbacks: DownloadCallbacks;

    public onCompleteObservers: JobObserver[];
    public onProgressObservers: JobObserver[];

    writer : WriteStream | null = null;


    constructor(url: string, downloadPath: string, callbacks: DownloadCallbacks) {
        this.url = url;
        this.downloadPath = downloadPath;
        this.token = generateId();
        this.callbacks = callbacks;

        this.onCompleteObservers = [callbacks.onComplete];
        this.onProgressObservers = [callbacks.onProgress];
    }

    onComplete() {
        this.status = 'completed';
        this.writer?.end();
        modifyFilePermissions(this.downloadPath, 0o644);
        this.onCompleteObservers.forEach(observer => observer(this));
        // this.callbacks.onComplete(this);
    }

    onProgress(chunk : Buffer) {
        if (this.status !== 'downloading') this.status = 'downloading';

        this.lastUpdated = new Date();
        // const lastSize = this.downloadedBytes;
        // const currentSize = this.downloadedBytes + chunk.length;
        this.downloadedBytes += chunk.length;
        // sometimes downloads do not have a content-length header
        this.progress = this.totalBytes ? Math.round(this.downloadedBytes / this.totalBytes * 100) : 0;
        // this.callbacks.onProgress(this);
        this.onProgressObservers.forEach(observer => observer(this));
    }

    onError(error: string) {
        this.status = 'failed';
        this.error = error;
        this.callbacks.onError(error);
    }


    async start() {
        try {
            const response = await axios.get(this.url, {
                responseType: 'stream'
            });
            this.status = 'started';

            this.lastUpdated = new Date();
            this.writer = createWriteStream(this.downloadPath);
            this.totalBytes = parseInt(response.headers['content-length'] || '0', 10) || null;
    
            response.data.pipe(this.writer);
    
            response.data.on('data', (chunk : Buffer) => this.onProgress(chunk));
            this.writer.on('finish', () => this.onComplete());
            this.writer.on('error', (error: string) => this.onError(error));

        } catch (error : any) {
            this.onError(error.message);
            return;
        }
    }


    public evaluateTimeout() {
        if (this.lastUpdated && this.status === 'downloading') {
            const now = new Date();
            const diff = now.getTime() - this.lastUpdated.getTime();
            if (diff > this.ttl) {
                // think about having an array of places that you can 
                // log to, so that they can selectively be displayed by
                // cli interface
                Debug.error(`Download ${this.token} timed out`);
                this.cancel();
            }
        }
    }

    cancel() {
        this.writer?.close();
        this.status = 'failed';
    }
}
