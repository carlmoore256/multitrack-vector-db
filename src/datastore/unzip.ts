import { createWriteStream, createReadStream, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, rmSync } from 'fs';
import { STORAGE_ROOT } from '../definitions.js';
import path from "path";

import { generateHashId } from '../utils/utils.js';

import { IMultitrackRecording } from '../models/cambridge-models.js';
import { IDownloadJob } from '../downloading/DownloadManager.js';
import { IAudioFile } from '../models/audio-models.js';
import { Debug, LogColor } from "../utils/Debug.js";
import { getAudioFileInfo } from '../audio-file.js';
import { flattenDir } from '../utils/files.js';

import decompress from 'decompress';

export async function unzipFile(srcPath: string, destPath: string) : Promise<decompress.File[] | null> {
    try {
        const res = await decompress(srcPath, destPath);
        return res;
    } catch (err) {
        Debug.logError(`Error unzipping file: ${err}`);
        return null;
    }
}


// unzips all files into a directory, flattens it, then removes the original zip
export async function unzipIntoDirectory(
    zipFilePath: string,
    outputDir: string,
    makeOutputDir: boolean = true,
    flatten: boolean = true,
    cleanup: boolean = true
) : Promise<string[] | null> {

    if (!existsSync(outputDir)) {
        if (!makeOutputDir) {
            throw new Error(`Output directory does not exist: ${outputDir}`);
        }
        Debug.log(`Creating output directory: ${outputDir}`);
        mkdirSync(outputDir);
    }

    Debug.log(`Unzipping file: ${zipFilePath} => ${outputDir}`);

    const files = await unzipFile(zipFilePath, outputDir);
    if (!files) {
        return null;
    }
    Debug.log(`Unzipped ${files.length} files`, LogColor.Green);

    let paths = files.map(f => f.path);

    if (flatten) {
        Debug.log(`Flattening directory: ${outputDir}`);
        flattenDir(outputDir);
        let originalFilenames = paths.map(p => path.basename(p));
        // make sure that we only return the files that have been flattened
        paths = readdirSync(outputDir).filter(p => originalFilenames.includes(path.basename(p)));
        Debug.log(`Flattened paths: ${paths}`, LogColor.Green);
    }
    
    Debug.logError(`Removing downloaded file: ${zipFilePath}`);
    if (cleanup) {
        unlinkSync(zipFilePath);
    }

    return paths;
}


export async function unzipMultitracks(
    multitrackRecording: IMultitrackRecording,
    completedDownload: IDownloadJob,
): Promise<IAudioFile[] | null> {
    
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

    Debug.log(`Unzipping file: ${completedDownload.downloadPath} => ${outputDir}`);

    const files = await unzipFile(completedDownload.downloadPath, outputDir);
    if (!files) {
        return null;
    }

    Debug.log(`Unzipped ${files.length} files`, LogColor.Green);
    
    const paths = files.map(f => f.path);
    const audioFiles : IAudioFile[] = [];
    let generatedDirs : string[] = [];

    // check to see if paths are in the output dir, or if there are additional subdirs
    // if there are subdirs, we need to move the files up to the output dir
    for(const p of paths) {
        const splits = p.split(path.sep);
        Debug.log(`SSPLIT: ${splits} | ${splits.length} | ${p}`)
        let newPath = path.resolve(p);
        if (splits.length > 1) {
            const filename = path.basename(p);
            newPath = path.join(outputDir, filename);
            generatedDirs.push(p.replace(filename, ""));
            // if the audio file is in a nested directory, pull it out
            Debug.log(`Moving file ${p} => ${newPath}`);
            renameSync(p, newPath);
        }

        // verify if it's an audio file (often there are readmes or other files)
        const audioFile = getAudioFileInfo(newPath);
        if (audioFile) {
            audioFiles.push(audioFile);
        }
    }


    // remove any generated directories
    generatedDirs = [...new Set(generatedDirs)];
    for(const dir of generatedDirs) {
        Debug.logError(`Removing generated directory: ${dir}`);
        // enable when you think its safe
        // rmSync(dir, { recursive: true });
    }


    Debug.logError(`Removing downloaded file: ${completedDownload.downloadPath}`);
    // enable when you think its safe
    // unlinkSync(completedDownload.downloadPath);

    return audioFiles;
}



//     return {
//         id: generateHashId(f, 8), // think of something meaningful
//         uri: f,
//         name: path.basename(f),
//         bytes: completedDownload.totalBytes,
//         recording_id: multitrackRecording.id,
//     };
// });