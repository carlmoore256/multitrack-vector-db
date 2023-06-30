import { IMultitrackRecording, IRecordingDownloadableResource, RecordingDownloadableResourceType } from "../models/cambridge-models.js";
import DatabaseClient from "../database/DatabaseClient.js";
import { generateId } from "../utils/utils.js";
import path from "path";
import { createWriteStream, existsSync, mkdirSync, copyFileSync, copyFile, unlinkSync, chmodSync } from 'fs';
import { Debug } from "../utils/Debug.js";
import { unzipFile } from "../datastore/unzip.js";
import { STORAGE_ROOT, DOWNLOAD_TEMP_DIR } from "../definitions.js";
import { unzipMultitracks } from "../datastore/unzip.js";
import { getRecordingDestinationPath } from "../Recording.js";
import { IAudioFile } from "../models/audio-models.js";
import { DownloadManager, IDownloadJob, DownloadCallbacks } from "./DownloadManager.js";
import { addAudioFileToDatabase } from "../audio-file.js";

// supply a client and a string query
export async function downloadFromQuery(
    dbClient: DatabaseClient,
    query: string,
    type : RecordingDownloadableResourceType | "all" = "multitrack"
) {
    const manager = DownloadManager.Instance;

    const res = await dbClient.query(query);
    if (!res || res?.length === 0) {
        console.log('No recordings found');
        return;
    }
    
    const recordings = res.map(r => r as IMultitrackRecording);
    if (!recordings || recordings.length === 0) {
        console.log('No recordings found');
        return;
    }
    
    recordings.forEach(async (recording) => {
        const resources = await dbClient.query('multitrack_recording_download', { 
            recording_id: recording.id
        } as any);

        if (!resources || resources.length === 0) {
            console.log('No resources found');
            return;
        }
        const resource = resources.find(r => r.type === type);
        if (!resource) {
            console.log('No resources found');
            return;
        }
        manager.addToQueue(resource, {
            onComplete: async (job : IDownloadJob) => {
                const audioFiles = await unzipMultitracks(recording, job);
                if (!audioFiles) {
                    Debug.logError(`Error unzipping multitrack recording ${recording.name}`);
                    return;
                };
                audioFiles.forEach(a => addAudioFileToDatabase(dbClient, a, recording));
            },
            onError: (e) => {
                console.error(`Error downloading file: ${e}`);
            },
            onProgress: (progress) => {
                console.log(`Download progress: ${progress}`);
            }
        });
    });
}

export async function generalQuery(
    dbClient: DatabaseClient,
) {
    const query = await dbClient.queryDialog(`
        SELECT 
            multitrack_recording.id as recording_id,
            multitrack_recording.name as recording_name,
            multitrack_recording_download.url as url,
            multitrack_recording_download.type as type,
            multitrack_recording_download.bytes as total_bytes
        FROM 
            multitrack_recording
        INNER JOIN
            audio_file
        ON
            multitrack_recording.id = audio_file.recording_id
        INNER JOIN
            multitrack_recording_download
        ON
            multitrack_recording.id = multitrack_recording_download.recording_id
        ORDER BY
            multitrack_recording_download.bytes DESC
        LIMIT 10
    `);
    if (!query || query.length === 0) {
        console.log('No recordings found');
        return;
    }
    Debug.log("GOT QUERY", query);
}


export async function downloadAllMultitracks(
    dbClient: DatabaseClient,
    limit : number = 10,
) {
    const query = await dbClient.queryDialog(`--sql
        SELECT 
            multitrack_recording.id as id,
            multitrack_recording.name as recording_name,
            multitrack_recording_download.url as url,
            multitrack_recording_download.type as type,
            multitrack_recording_download.bytes as total_bytes,
            multitrack_recording_download.bytes / 1048576.0 as total_megabytes
        FROM 
            multitrack_recording
        LEFT JOIN
            recording_file
        ON
            multitrack_recording.id = recording_file.recording_id
        INNER JOIN
            multitrack_recording_download
        ON
            multitrack_recording.id = multitrack_recording_download.recording_id
        WHERE
            recording_file.recording_id IS NULL
        AND
            multitrack_recording_download.bytes > 0
        AND
            multitrack_recording_download.type = 'multitrack'
        ORDER BY
            multitrack_recording_download.bytes ASC
        LIMIT ${limit}
        `);

    if (!query || query.length === 0) {
        console.log('No recordings found');
        return;
    }

    for (const recording of query) {
        Debug.log(`Downloading ${recording.recording_name} | ${recording.total_megabytes} MB`);
        await downloadMultitrackRecording(dbClient, recording, "multitrack");
    }
}

export async function downloadMultitrackFromDialog(
    dbClient: DatabaseClient,
    type : RecordingDownloadableResourceType |  "all" = "multitrack"
) {
    const query = await dbClient.queryDialog(`
        SELECT 
            multitrack_recording.id as id,
            multitrack_recording.name as recording_name,
            multitrack_recording_download.url as url,
            multitrack_recording_download.bytes as total_bytes
        FROM 
            multitrack_recording
        INNER JOIN
            audio_file
        ON
            multitrack_recording.id = audio_file.recording_id
        INNER JOIN
            multitrack_recording_download
        ON
            multitrack_recording.id = multitrack_recording_download.recording_id
        ORDER BY
            multitrack_recording_download.bytes DESC
        LIMIT 10
    `);
    if (!query || query.length === 0) {
        console.log('No recordings found');
        return;
    }

    console.log("GOT QUERY", query);
    console.log(`Downloading ${query.length} recordings`);

    for(const recording of query) {
        await downloadMultitrackRecording(dbClient, recording, type);
    }

    // (query as IMultitrackRecording[]).forEach(async (recording) => {
    //     await downloadMultitrackRecording(dbClient, recording, type);
    // });
}

export function finalizeSingleDownload(
    job : IDownloadJob,
    resource : IRecordingDownloadableResource,
    recording : IMultitrackRecording
) : IAudioFile {
    const filepath = job.downloadPath;

    let destPath = getRecordingDestinationPath(recording);
    destPath = path.join(destPath, resource.filename);

    return {
        id: generateId(),
        uri: destPath,
        name: path.basename(destPath),
        bytes: job.totalBytes,
        recording_id: recording.id,
    } as IAudioFile;
}




// helper to query and download tracks
export async function downloadMultitrackRecording(
        dbClient: DatabaseClient,
        recording : IMultitrackRecording, 
        type : RecordingDownloadableResourceType | "all" = "multitrack") 
{
    const manager = DownloadManager.Instance;


    var query = `
    SELECT
        id, type, filename, url, bytes
    FROM
        multitrack_recording_download
    WHERE
        recording_id = '${recording.id}'
    `
    if (type !== "all") query += `AND type = '${type}'`;

    Debug.log(`Gonna run the query: ${query}`);
    const results = await dbClient.query(query);
    if (!results) {
        // throw new Error("No results found");
        Debug.logError("No results found");
        return;
    }   
    
    const destDir = getRecordingDestinationPath(recording);
    
    for (let resource of results) {    
        const callbacks : DownloadCallbacks = {
            onComplete: async (job : IDownloadJob) => {

                if (job.resource.type === "multitrack") {
                    Debug.log(`[NOW RUNNING] Unzipping ${job.downloadPath}`);
                    const audioFiles = await unzipMultitracks(recording, job);
                    if (!audioFiles) {
                        console.error(`Error unzipping ${job.downloadPath}`);
                        return;
                    }
                    // insert the audio files into the database
                    audioFiles.forEach(a => dbClient.insert('audio_file', a));
                    // set up the junction table entries that link a recording to an audiofile
                    audioFiles.forEach(a => dbClient.insert('recording_file', {
                        recording_id: recording.id,
                        file_id: a.id,
                    }));
                } else {
                    const audioFile = finalizeSingleDownload(job, resource, recording);
                    dbClient.insert('audio_file', audioFile);
                }
            },
            onError: (e) => {
                console.error(`Error downloading file: ${e}`);
            },
            onProgress: (progress) => {
                console.log(`Download progress: ${progress}`);
            }
        }


        if (!resource.url) continue;
        Debug.log(`Downloading ${resource.url}`);
        manager.addToQueue(resource, callbacks, path.join(destDir, resource.filename));
    }
}
            