import DatabaseClient from "../database/DatabaseClient.js";
import { STORAGE_ROOT } from "../definitions.js";
import { readdirSync, unlinkSync, rmSync, existsSync, mkdirSync } from "fs";
import { yesNoPrompt } from "../cli/cli-promts.js";
import path from "path";
import { Debug, LogColor } from "../utils/Debug.js";
import { IMultitrackRecording } from "../models/cambridge-models.js";
import { Datastore } from "./Datastore.js";
import { DatastoreFile } from "./DatastoreFile.js";
// handles storing/recalling multitrack files

export class MultitrackDatastore extends Datastore {

    constructor(
        dbClient: DatabaseClient,
        storageRoot: string = STORAGE_ROOT
    ) {
        super(dbClient, storageRoot);
    }

    public async getAudioFileById(id: string) {

    }

    public async ingestZipMultitrack(zipFilePath : string, recordingId : string) : Promise<DatastoreFile[] | null> {
        const datastoreFiles = await this.unzipIntoDatastore(zipFilePath, recordingId);
        if (!datastoreFiles) {
            return null;
        }
        datastoreFiles.forEach(async f => {
            await this.dbClient.query(`INSERT INTO recording_file (recording_id, file_id) VALUES ($1, $2)`, [recordingId, f.id]);
        });
        return datastoreFiles;
    }

    public async ingestSingleFileForRecording(filePath : string, recordingId : string) : Promise<DatastoreFile | null> {
        const datastoreFile = await this.addFileToDatastore({
            originalPath: filePath,
            directoryId: recordingId,
        });
        if (!datastoreFile) {
            return null;
        }
        await this.dbClient.query(`INSERT INTO recording_file (recording_id, file_id) VALUES ($1, $2)`, [recordingId, datastoreFile.id]);
        return datastoreFile;
    }

}
