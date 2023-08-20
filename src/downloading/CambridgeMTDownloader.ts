import { IMultitrackRecording } from "../models/cambridge-models.js";
import { DownloadManager } from "./DownloadManager.js";
import { DownloadCallbacks, DownloadJob } from "./DownloadJob.js";
import { getRecordingDestinationPath } from "../parsing/MultitrackRecording.js";
import { MultitrackDatastore } from "../datastore/MultitrackDatastore.js";
import { generateId } from "../utils/utils.js";
import { IAudioFile } from "../models/audio-models.js";
import { Debug } from "../utils/Debug.js";
import { readFileSync } from "fs";
import DatabaseClient from "../database/DatabaseClient.js";
import { PrismaClient, MultitrackDownloadType, MultitrackRecording } from "@prisma/client";
import path from "path";


export class CambridgeMTDownloader {

    private downloadManager = DownloadManager.Instance;
    // private datastore: MultitrackDatastore;

    constructor(private dbClient: DatabaseClient, private datastore: MultitrackDatastore) {

    }

    private async handleDownloadComplete(
        downloadPath: string,
        recordingId: string,
        downloadType: MultitrackDownloadType,
    ) {
        switch (downloadType) {
            case MultitrackDownloadType.MULTITRACK:
                await this.datastore.ingestZipMultitrack(downloadPath, recordingId);
                break;
            case MultitrackDownloadType.PREVIEW:
                await this.datastore.ingestSingleFileForRecording(downloadPath, recordingId);
                break;
            default:
                throw new Error(`Unknown resource type: ${downloadType}`);
        }
    }

    // supply a client and a string query
    public async downloadFromQuery(
        query: string,
        type: MultitrackDownloadType = MultitrackDownloadType.MULTITRACK
    ) {

        const res = await this.dbClient.queryRows(query);
        if (!res || res?.length === 0) {
            console.log('No recordings found');
            return;
        }

        const recordings = res.map(r => r as MultitrackRecording);
        if (!recordings || recordings.length === 0) {
            console.log('No recordings found');
            return;
        }

        for (const recording of recordings) {

            Debug.log(`Downloading ${recording.name} | ${JSON.stringify(recording)}`);
            const resources = await this.dbClient.queryTable('multitrack_recording_download', {
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

            Debug.log(`Got resource: ${JSON.stringify(resource)}`)

            this.downloadManager.addToQueue({
                url: resource.url,
                filename: resource.filename,
                callbacks : {
                    onComplete: async (job: DownloadJob) => {
                        await this.handleDownloadComplete(
                            job.downloadPath,
                            recording.id,
                            resource.type
                        );
                    },
                    onError: (e) => {
                        console.error(`Error downloading file: ${e}`);
                    },
                    onProgress: (progress) => {
                        console.log(`Download progress: ${progress}`);
                    }
                }
            });

        }

        // recordings.forEach(async (recording) => {
        // });
    }


    public async downloadAllMultitracks(limit: number=10, onAllComplete?: () => void) {

        let query = readFileSync('sql/queries/smallest_not_downloaded.sql', 'utf-8');
        query += ` LIMIT ${limit}`;

        console.log(`Running query: ${query}`);
        const rows = await this.dbClient.queryRows(query) as {
            id: string;
            url: string;
            filename: string;
            type: MultitrackDownloadType;
            num_tracks: number;
            name: string;
            bytes: number;
            total_megabytes: number;
        }[];

        if (!rows) {
            console.log('No recordings found');
            return;
        }

        let index = 0;
        for (const row of rows) {
            const isLast = index === rows.length - 1;
            Debug.log(`Downloading ${row.name} | ${row.total_megabytes} MB`);
            // await this.downloadMultitrackRecording(recording, "multitrack");
            const callbacks: DownloadCallbacks = {
                onComplete: async (job: DownloadJob) => {
                    await this.handleDownloadComplete(
                        job.downloadPath, 
                        row.id, 
                        row.type
                    );
                    if (isLast) {
                        onAllComplete?.();
                    }
                },
                onProgress: (job) => {},
                onError: (e) => {
                    console.error(`Error downloading file: ${e}`);
                },
            }

            if (!row.url) continue;
            Debug.log(`Downloading ${row.url}`);
            // , path.join(destDir, resource.filename)
            this.downloadManager.addToQueue({
                url: row.url,
                callbacks,
                totalBytes: row.bytes,
                filename: row.filename,
            });
            index++;
        }
    }




    // helper to query and download tracks
    public async downloadMultitrackRecording(
        recording: IMultitrackRecording,
        type: MultitrackDownloadType = MultitrackDownloadType.MULTITRACK) {

        var query = `SELECT
            multitrack_recording_download.id AS id, 
            type,
            filename, 
            url, 
            bytes
        FROM
            multitrack_recording_download
        LEFT JOIN
            multitrack_recording_file
        ON
            multitrack_recording_download.recording_id = multitrack_recording_file.recording_id
        LEFT JOIN
            datastore_file
        ON
            multitrack_recording_file.file_id = datastore_file.id
        WHERE
            multitrack_recording_download.recording_id = ?
        `
        // if (type !== "all") query += `AND type = '${type}'`;

        Debug.log(`Gonna run the query: ${query}`);

        const results = await this.dbClient.queryRows(query, [recording.id]) as {
            id: string;
            type: MultitrackDownloadType;
            filename: string;
            url: string;
            bytes: number;
        }[];

        if (!results) {
            Debug.error("No results found");
            return;
        }

        Debug.log(`Got results: ${JSON.stringify(results)}`);
        const destDir = getRecordingDestinationPath(recording);


        for (let resource of results) {

            let lastProgress = 0;
            const callbacks: DownloadCallbacks = {
                onComplete: async (job: DownloadJob) => {
                    await this.handleDownloadComplete(
                        job.downloadPath, 
                        recording.id, 
                        resource.type);
                },
                onProgress: (job) => {

                },
                onError: (e) => {
                    console.error(`Error downloading file: ${e}`);
                },
            }

            if (!resource.url) continue;
            Debug.log(`Downloading ${resource.url}`);
            // , path.join(destDir, resource.filename)
            this.downloadManager.addToQueue({
                url: resource.url,
                callbacks,
                totalBytes: resource.bytes,
            });
        }
    }
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




// public async downloadMultitrackFromDialog(
//     type: RecordingDownloadableResourceType | "all" = "multitrack"
// ) {
//     const query = await this.dbClient.queryDialog(`
//         SELECT 
//             multitrack_recording.id as id,
//             multitrack_recording.name as recording_name,
//             multitrack_recording_download.url as url,
//             multitrack_recording_download.bytes as total_bytes
//         FROM 
//             multitrack_recording
//         INNER JOIN
//             audio_file
//         ON
//             multitrack_recording.id = audio_file.recording_id
//         INNER JOIN
//             multitrack_recording_download
//         ON
//             multitrack_recording.id = multitrack_recording_download.recording_id
//         ORDER BY
//             multitrack_recording_download.bytes DESC
//         LIMIT 10
//     `);
//     if (!query || query.length === 0) {
//         console.log('No recordings found');
//         return;
//     }
//     for (const recording of query) {
//         await this.downloadMultitrackRecording(recording, type);
//     }
// }




// if (job.resource.type === "multitrack") {
//     Debug.log(`[NOW RUNNING] Unzipping ${job.downloadPath}`);
//     this.datastore.ingestZipMultitrack(job.downloadPath, recording.id);

// } else {
//     const audioFile = this.finalizeSingleDownload(job, resource, recording);
//     this.dbClient.insert('audio_file', audioFile);
// }

// const audioFiles = await unzipAudioFiles(job.downloadPath, destDir);
// if (!audioFiles) {
//     console.error(`Error unzipping ${job.downloadPath}`);
//     return;
// }
// // insert the audio files into the database
// audioFiles.forEach(a => this.dbClient.insert('audio_file', a));
// // set up the junction table entries that link a recording to an audiofile
// audioFiles.forEach(a => this.dbClient.insert('multitrack_recording_file', {
//     recording_id: recording.id,
//     file_id: a.id,
// }));


    // const query = await this.dbClient.queryDialog(`
    //     SELECT
    //         multitrack_recording.id as id,
    //         multitrack_recording.name as recording_name,
    //         multitrack_recording_download.url as url,
    //         multitrack_recording_download.type as type,
    //         multitrack_recording_download.bytes as total_bytes,
    //         multitrack_recording_download.bytes / 1048576.0 as total_megabytes
    //     FROM
    //         multitrack_recording
    //     LEFT JOIN
    //         multitrack_recording_file
    //     ON
    //         multitrack_recording.id = multitrack_recording_file.recording_id
    //     INNER JOIN
    //         multitrack_recording_download
    //     ON
    //         multitrack_recording.id = multitrack_recording_download.recording_id
    //     WHERE
    //         multitrack_recording_file.recording_id IS NULL
    //     AND
    //         multitrack_recording_download.bytes > 0
    //     AND
    //         multitrack_recording_download.type = 'multitrack'
    //     ORDER BY
    //         multitrack_recording_download.bytes ASC
    //     LIMIT ${limit}
    //     `);
