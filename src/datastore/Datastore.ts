import DatabaseClient from "../database/DatabaseClient.js";
import { STORAGE_ROOT } from "../definitions.js";
import { readdirSync, unlinkSync, rmSync, existsSync, mkdirSync } from "fs";
import { yesNoPrompt } from "../cli/cli-promts.js";
import path from "path";
import { Debug, LogColor } from "../utils/Debug.js";
import { IMultitrackRecording } from "../models/cambridge-models.js";
import { DatastoreFile } from "./DatastoreFile.js";

// handles storing/recalling any DatastoreFile
export class Datastore {

    constructor(
        private dbClient: DatabaseClient,
        public storageRoot: string = STORAGE_ROOT, // directory where the files reside
        private tableName: string = 'datastore_file',
        private id = 'datastore'
    ) {
        if (!dbClient.isConnected) {
            throw new Error(`Database client is not connected!`);
        }
    }

    /**
     * Wipes all files in storageRoot
     */
    private wipeStorage() {
        const allFiles = readdirSync(this.storageRoot);
        allFiles.forEach(f => {
            Debug.log(`Deleting file: ${f}`, LogColor.Red, this.id);
            rmSync(path.resolve(this.storageRoot, f), { recursive: true });
        });
    }

    /**
     * Wipes all files in storageRoot and deletes all rows in the database
     * @param updateDatabase whether or not to delete the rows in the database
     * @returns Promise of success of wipe operation
     */
    public async wipe() : Promise<boolean> {
        const res = await yesNoPrompt(`Are you sure you want to wipe the datastore?`);
        if (!res) {
            Debug.log(`Aborting wipe`, LogColor.Red, this.id);
            return false;
        }

        this.wipeStorage();
        
        const queryRes = await this.dbClient.query(`DELETE FROM $1`, [this.tableName]);
        if (queryRes.rowCount === 0) {
            Debug.logError(`No files deleted from ${this.tableName}!`);
            return false;
        }
        Debug.log(`Deleted ${queryRes.rowCount} rows from ${this.tableName}`, LogColor.Green, this.id);
        return true;
    }

    // makes sure all of the multitracks are accounted for
    public async validate(): Promise<boolean> {

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

        if (invalidFiles.length > 0) {
            const res = await yesNoPrompt(`Found ${invalidFiles.length} invalid files. Delete them?`);
            if (res) {
                invalidFiles.forEach(f => {
                    unlinkSync(f);
                });
            } else {
                return false;
            }
        }

        const allIds = await this.dbClient.queryRows(`SELECT id FROM $1`, [this.tableName]);

        // no ids found, but there are folders
        if (!allIds && folderIds.length > 0) {
            const res = await yesNoPrompt(
                `Found ${folderIds.length} folders in the root directory, but no valid audio files. 
                Wipe storage root at ${this.storageRoot}?`
            );
            if (res) {
                this.wipeStorage();
            }
            return false;
        }

        // -- SPECIAL CASE -- nothing found at all, but datastore is valid
        if (!allIds && folderIds.length === 0) {
            Debug.log(`No files or database entries found. Datastore ready for new files`);
            return true;
        }

        const notInDatabase = folderIds.filter(id => !(allIds as any).includes(id));
        const notInStorage = (allIds as any).filter((id: any) => !folderIds.includes(id));

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

        if (notInStorage.length > 0) {
            const res = await yesNoPrompt(`Found ${notInStorage.length} database entries not in folder. Delete?`);
            if (res) {
                notInStorage.forEach((id: string) => {
                    this.dbClient.query(`DELETE FROM $1 WHERE id = $2`, [this.tableName, id]);
                });
                // recursively run
                this.validate();
            } else {
                return false;
            }
        }
        return true;
    }

    public async addDatastoreFile(file: DatastoreFile) : Promise<boolean> {
        const { query, values } = file.toInsertQuery(this.tableName);
        const res = await this.dbClient.queryRows(query, values);
        if (!res) return false;
        return true;
    }

    public async getDatastoreFileById(id: string) : Promise<DatastoreFile | null> {
        const query = `SELECT * FROM $1 WHERE id = $2`;
        const values = [this.tableName, id];
        const res = await this.dbClient.queryRows(query, values);
        if (!res) return null;
        return DatastoreFile.fromDatabaseRow(res[0]);
    }
}
