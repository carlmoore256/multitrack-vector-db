import { readdirSync, unlinkSync, lstatSync } from 'fs';
import path from "path";
import { IAudioFile } from '../models/audio-models.js';
import { Debug, LogColor } from "../utils/Debug.js";
import { createAudioFileInfo, isAudioFile } from '../audio-file.js';
import { flattenDir, checkMakeDir } from '../utils/files.js';

import decompress from 'decompress';

export async function unzipFile(srcPath: string, destPath: string) : Promise<decompress.File[] | null> {
    try {
        const res = await decompress(srcPath, destPath);
        return res;
    } catch (err) {
        Debug.error(`Error unzipping file: ${err}`);
        return null;
    }
}

// unzips all files into a directory
export async function unzipIntoDirectory(zipFilePath: string, outputDir: string) : Promise<string[] | null> {
    if (!zipFilePath.endsWith('.zip')) {
        throw new Error(`Expected zip file, got ${zipFilePath}`);
    }
    const files = await unzipFile(zipFilePath, outputDir);
    if (!files) {
        return null;
    }
    let paths = files.map(f => f.path);
    paths = paths.filter(p => {
        const stats = lstatSync(path.join(outputDir, p));
        return stats.isFile();
    })
    return paths;
}

// export async function unzipIntoDatastore(zipFilePath : string, datastore : Datastore, id : string) : Promise<DatastoreFile[] | null> {

//     // const id = datastore.idGenerator(zipFilePath);
//     // const outputDir = path.resolve(datastore.storageRoot, id);

//     Debug.log(`Unzipping file: ${zipFilePath} => ${outputDir}`);
//     let paths = await unzipIntoDirectory(zipFilePath, outputDir);

//     if (!paths) {
//         Debug.logError(`Error unzipping file: ${zipFilePath}`);
//         return null
//     }

//     let originalFilenames = paths.map(p => path.basename(p));
//     paths = readdirSync(outputDir).filter(p => originalFilenames.includes(path.basename(p)));
// }


// unzips all files into a directory, flattens it, then removes the original zip
export async function unzipAudioFiles(zipFilePath: string, outputDir: string) : Promise<IAudioFile[] | null> {

    Debug.log(`Unzipping file: ${zipFilePath} => ${outputDir}`);
    let paths = await unzipIntoDirectory(zipFilePath, outputDir);

    if (!paths) {
        Debug.error(`Error unzipping file: ${zipFilePath}`);
        return null
    }

    // filter valid paths
    paths = paths.filter(isAudioFile);

    flattenDir(outputDir);
    let originalFilenames = paths.map(p => path.basename(p));
    // make sure that we only return the files that have been flattened
    paths = readdirSync(outputDir).filter(p => originalFilenames.includes(path.basename(p)));

    const audioFiles = [];    
    for(const p of paths) {
        const audioFile = createAudioFileInfo(p);
        if (audioFile) audioFiles.push(audioFile);
    }

    Debug.error(`Removing downloaded file: ${zipFilePath}`);
    unlinkSync(zipFilePath);

    return audioFiles;
}