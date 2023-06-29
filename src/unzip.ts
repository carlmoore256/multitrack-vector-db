import { createWriteStream, createReadStream, existsSync, mkdirSync, readdirSync } from 'fs';
import zlib from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { STORAGE_ROOT } from './definitions.js';
import path from "path";

import { generateHashId } from './utils/utils.js';

import { IMultitrackRecording } from './models/cambridge-models.js';
import { IDownloadJob } from './DownloadManager.js';
import { IAudioFile } from './models/audio-models.js';
import { Debug } from "./utils/Debug.js";

const asyncPipeline = promisify(pipeline);

export async function unzipFile(srcPath: string, destPath: string) {
    const readStream = createReadStream(srcPath);
    const writeStream = createWriteStream(destPath);
    const unzip = zlib.createUnzip();

    try {
        await asyncPipeline(readStream, unzip, writeStream);
        console.log(`File unzipped successfully: ${destPath}`);
    } catch (err) {
        console.error(`Error occurred while unzipping file: ${err}`);
    }
}

export async function unzipMultitracks(
    multitrackRecording: IMultitrackRecording,
    completedDownload: IDownloadJob,
): Promise<IAudioFile[]> {
    
    if (completedDownload.resource.type !== "multitrack") {
        throw new Error("Can only unzip multitrack recordings");
    }

    if (completedDownload.status !== "completed") {
        throw new Error("Can only unzip completed downloads");
    }

    const outputDir = path.join(STORAGE_ROOT, multitrackRecording.id);
    if (!existsSync(completedDownload.downloadPath)) {
        throw new Error("Downloaded file does not exist");
    }

    if (!existsSync(outputDir)) {
        Debug.log(`Creating output directory: ${outputDir}`);
        mkdirSync(outputDir);
    }

    unzipFile(completedDownload.downloadPath, outputDir);

    let files = readdirSync(outputDir);
    files = files.map(f => path.resolve(f));

    return files.map(f => {
        return {
            id: generateHashId(f, 16), // think of something meaningful
            uri: f,
            name: path.basename(f),
            tags: [],
            bytes: completedDownload.totalBytes,
            metadata : {},
            recording_id: multitrackRecording.id,
        };
    });
}

