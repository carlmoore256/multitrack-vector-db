import DatabaseClient from "../database/DatabaseClient.js";
import { STORAGE_ROOT } from "../definitions.js";
import { readdirSync, unlinkSync, rmSync, existsSync, mkdirSync } from "fs";
import { yesNoPrompt } from "../cli/cli-promts.js";
import path from "path";
import { Debug, LogColor } from "../utils/Debug.js";
import { IMultitrackRecording } from "../models/cambridge-models.js";

// handles storing/recalling multitrack files
export class MultitrackDatastore {

    constructor(
        private dbClient: DatabaseClient,
        public storageRoot: string = STORAGE_ROOT, // directory where the files reside
    ) {
        if (!dbClient.isConnected) {
            throw new Error(`Database client is not connected!`);
        }
    }

    public async wipe(updateDatabase: boolean = true) {
        const res = await yesNoPrompt(`Are you sure you want to wipe the datastore?`);
        if (!res) {
            Debug.log(`Aborting wipe`);
            return;
        }
        const allFiles = readdirSync(this.storageRoot);
        allFiles.forEach(f => {
            Debug.log(`Deleting file: ${f}`, LogColor.Red);
            rmSync(path.resolve(this.storageRoot, f), { recursive: true });
        });

        if (!updateDatabase) return;

        const queryRes = await this.dbClient.query(`--sql
            DELETE FROM
                audio_file
        `);
        if (queryRes.rowCount === 0) {
            Debug.logError(`No files deleted from audio_file!`);
            return;
        }
        Debug.log(`Deleted ${queryRes.rowCount} rows from audio_file`);
    }

    // makes sure all of the multitracks are accounted for
    public async validate(): Promise<boolean> {

        if (!this.dbClient.isConnected) {
            throw new Error(`Database client is not connected!`);
        }

        if (!existsSync(this.storageRoot)) {
            Debug.logError(`Storage root does not exist: ${this.storageRoot}`);
            const res = await yesNoPrompt(`Datastore root ${this.storageRoot} does not exist. Create directory?`);
            if (res) {
                mkdirSync(this.storageRoot);
            } else {
                return false;
            }
        }

        const topLevelFiles = readdirSync(this.storageRoot, { withFileTypes: true });
        const folderIds = topLevelFiles.filter(f => f.isDirectory()).map(f => f.name);

        const invalid = topLevelFiles.filter(f => !f.isDirectory());
        const invalidFiles = invalid.map(f => path.resolve(this.storageRoot, f.name));
        console.log(invalidFiles);

        if (invalidFiles.length > 0) {
            const res = await yesNoPrompt(`Found ${invalidFiles.length} invalid files. Delete them?`);
            console.log(`res: ${res}`);
            if (res) {
                invalidFiles.forEach(f => {
                    unlinkSync(f);
                });
            } else {
                return false;
            }
        }

        const allIds = await this.dbClient.queryRows(`SELECT id FROM audio_file`);

        // no ids found, but there are folders
        if (!allIds && folderIds.length > 0) {
            const res = await yesNoPrompt(`Found ${folderIds.length} folders in the root directory, but no valid audio files. Wipe datastore?`);
            console.log(`res: ${res}`);
            if (res) {
                await this.wipe(false);
            }
            return false;
        }

        // -- SPECIAL CASE -- nothing found at all, but datastore is valid
        if (!allIds && folderIds.length === 0) {
            Debug.log(`No files or database entries found. Datastore ready for new files`);
            return true;
        }

        const notInDatabase = folderIds.filter(id => !(allIds as any).includes(id));
        const notInFolder = (allIds as any).filter((id: any) => !folderIds.includes(id));

        Debug.log(`Not in database: ${notInDatabase}`);
        Debug.log(`Not in folder: ${notInFolder}`);

        if (notInDatabase.length > 0) {
            const res = await yesNoPrompt(`Found ${notInDatabase.length} folders not in database. Delete?`);
            if (res) {
                notInDatabase.forEach(id => {
                    rmSync(path.resolve(this.storageRoot, id), { recursive: true });
                });
                // recursively run
                this.validate();
            } else {
                return false;
            }
        }

        if (notInFolder.length > 0) {
            const res = await yesNoPrompt(`Found ${notInFolder.length} database entries not in folder. Delete?`);
            if (res) {
                notInFolder.forEach((id: string) => {
                    this.dbClient.query(`--sql
                        DELETE FROM
                            audio_file
                        WHERE
                            id = $1
                    `, [id]);
                });
                // recursively run
                this.validate();
            } else {
                return false;
            }
        }
        return true;
    }

    // public async addMultitrackFiles()


    public async getAudioFileById(id: string) {

    }

}
