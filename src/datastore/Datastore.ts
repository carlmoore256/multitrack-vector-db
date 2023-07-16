import DatabaseClient from "../database/DatabaseClient.js";
import { STORAGE_ROOT } from "../definitions.js";
import { readdirSync, unlinkSync, rmSync, existsSync, mkdirSync, statSync, copyFileSync, renameSync } from "fs";
import { yesNoPrompt } from "../cli/cli-promts.js";
import { Debug, LogColor } from "../utils/Debug.js";
import { IMultitrackRecording } from "../models/cambridge-models.js";
import { DatastoreFile } from "./DatastoreFile.js";
import { DatastoreDirectory } from "./DatastoreDirectory.js";
import { generateHashId } from "../utils/utils.js";
import { checkMakeDir, getMimeType } from "../utils/files.js";
import { unzipIntoDirectory } from "./unzip.js";
import { flattenDir, getAllFilesInDir, isSubPath } from "../utils/files.js";

import path from "path";

// export interface IDatastore

// handles storing/recalling any DatastoreFile
export class Datastore {

    public idGenerator = (data : string) => generateHashId(data, 16);

    constructor(
        public dbClient: DatabaseClient,
        public storageRoot: string = STORAGE_ROOT, // directory where the files reside
        private fileTableName: string = 'datastore_file',
        private tableIdColumn: string = 'id',
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
        
        const queryRes = await this.dbClient.query(`DELETE FROM $1`, [this.fileTableName]);
        if (queryRes.rowCount === 0) {
            Debug.error(`No files deleted from ${this.fileTableName}!`);
            return false;
        }
        Debug.log(`Deleted ${queryRes.rowCount} rows from ${this.fileTableName}`, LogColor.Green, this.id);
        return true;
    }

    public fileToId(filePath: string) {
        return path.basename(filePath).split('.')[0];
    }

    // makes sure all of the multitracks are accounted for
    public async validate(): Promise<boolean> {

        if (!existsSync(this.storageRoot)) {
            Debug.error(`Storage root does not exist: ${path.resolve(this.storageRoot)}`);
            const res = await yesNoPrompt(`Datastore root ${this.storageRoot} does not exist. Create directory?`);
            if (res) {
                mkdirSync(this.storageRoot);
            } else {
                return false;
            }
        }

        const allFiles = getAllFilesInDir(this.storageRoot);
        // const allFileIds = allFiles.map(this.fileToId);
        const allFileIdsMap = allFiles.map(f => ({ id: this.fileToId(f), path: f }));
        const allDatabaseIdRows = await this.dbClient.queryRows(`SELECT ${this.tableIdColumn} FROM ${this.fileTableName}`) as { id: string }[];
        let allDatabaseIds : string[] = [];
        if (!allDatabaseIdRows) allDatabaseIds = [];
        allDatabaseIds = allDatabaseIdRows.map((row: any) => row[this.tableIdColumn]);

        // -- SPECIAL CASE -- nothing found at all, but datastore is valid
        if (!allDatabaseIds && allFiles.length === 0) {
            Debug.log(`No files or database entries found. Datastore ready for new files`);
            return true;
        }

        const allFileIds = allFileIdsMap.map(f => f.id);
        const notInDatabase = allFileIdsMap.filter(f => !allDatabaseIds.includes(f.id));
        const notInStorage = allDatabaseIds.filter((id: any) => !allFileIds.includes(id));

        if (notInDatabase.length > 0) {
            Debug.logObject(allDatabaseIds);
            const res = await yesNoPrompt(`Found ${notInDatabase.length} files not in database. Delete files?`);
            if (res) {
                for (const item of notInDatabase) {
                    console.log(`Deleting file: ${item.path}`);
                    rmSync(item.path);
                }
            } else {
                return false;
            }
        }

        if (notInStorage.length > 0) {
            const res = await yesNoPrompt(`Found ${notInStorage.length} database entries without files. Delete from database?`);
            if (res) {
                const promises = notInStorage.map((id) => this.dbClient.query(`DELETE FROM ${this.fileTableName} WHERE ${this.tableIdColumn} = $1`, [id]));
                await Promise.all(promises);
            } else {
                return false;
            }
        }
        return true;
    }

    public async addDatastoreFile(file: DatastoreFile) : Promise<boolean> {
        const { query, values } = file.toInsertQuery(this.fileTableName);
        const res = await this.dbClient.queryRows(query, values);
        if (!res) return false;
        return true;
    }

    public async getDatastoreFileById(id: string) : Promise<DatastoreFile | null> {
        const query = `SELECT * FROM ${this.fileTableName} WHERE ${this.tableIdColumn} = $1`;
        const values = [this.fileTableName, id];
        const res = await this.dbClient.queryRows(query, values);
        if (!res) return null;
        return DatastoreFile.fromDatabaseRow(res[0]);
    }


    public getDirectoryFromId(id : string) {
        return path.resolve(this.storageRoot, id);
    }

    // gets a datastore file, but isn't finalized
    public datastoreFileFromPath(params : {
        originalPath: string,
        directoryId: string,
        id?: string, 
        name?: string, 
        metadata?: any
    }) : DatastoreFile {

        let { originalPath, directoryId, id, name, metadata } = params;
        if (!existsSync(originalPath)) {
            throw new Error(`File does not exist: ${originalPath}`);
        }
        
        const filename = path.basename(originalPath);
        const ext = path.extname(originalPath);
        id = id || this.idGenerator(originalPath);
        const newFullPath = path.join(this.storageRoot, directoryId, id + ext);
        const stats = statSync(originalPath);
        const createdAt = new Date(stats.birthtimeMs);
        const updatedAt = new Date(stats.mtimeMs);
        const type = getMimeType(originalPath) || 'application/octet-stream';

        if (!isSubPath(this.storageRoot, originalPath)) {
            const outputDir = this.getDirectoryFromId(directoryId);
            Debug.log(`Copying file from ${originalPath} => ${outputDir}`);
            copyFileSync(originalPath, newFullPath);
        } else {
            Debug.log(`File already in datastore, renaming to ${newFullPath}`);
            renameSync(originalPath, newFullPath);
        }

        const newPath = newFullPath.replace(this.storageRoot, '');

        return new DatastoreFile(
            id,
            newPath,
            name || filename,
            type,
            stats.size,
            ext,
            createdAt,
            updatedAt,
            metadata || {}
        );
    }


    /**
     * Unzips a zip file into a new datastore directory, creating the new entries
     */
    public async unzipIntoDatastore(zipFilePath : string, directoryId : string) : Promise<DatastoreFile[] | null> {
        const outputDir = this.getDirectoryFromId(directoryId);
        checkMakeDir(outputDir);
        
        let paths = await unzipIntoDirectory(zipFilePath, outputDir);
        if (!paths) {
            Debug.error(`Error unzipping file: ${zipFilePath}`);
            return null
        }

        flattenDir(outputDir);
        let originalFilenames = paths.map(p => path.basename(p));
        // make sure that we only return the files that have just been added
        paths = readdirSync(outputDir).filter(p => originalFilenames.includes(path.basename(p)));

        
        const datastoreFiles = paths.map(p => {
            return this.datastoreFileFromPath({
                originalPath: path.join(outputDir, p),
                directoryId,
                id: this.idGenerator(directoryId + p) // earlier we were having a problem where "kick_1.wav" was conflicting with existing other records
                // with the same hashed id, so we will add the directoryId to the hash to avoid collision
            });
        });

        const insertQueries = datastoreFiles.map(f => f.toUpsertQuery(this.fileTableName, this.tableIdColumn));

        // make this change to await all insertions
        const promises = insertQueries.map(q => this.dbClient.query(q.query, q.values));
        await Promise.all(promises);
        // add all the files to the database
        // this.dbClient.insertMany(this.tableName, datastoreFiles.map(f => f.toInsertQuery(this.tableName)));

        Debug.error(`Removing downloaded file: ${zipFilePath}`);
        unlinkSync(zipFilePath);

        return datastoreFiles;
    }


    public async addFileToDatastore(params : {
        originalPath: string,
        directoryId: string,
        id?: string,
        name?: string,
        metadata?: any
    }) : Promise<DatastoreFile | null> {
        const { originalPath, directoryId, id, name, metadata } = params;
        const file = this.datastoreFileFromPath({ originalPath, directoryId, id, name, metadata });
        const res = await this.addDatastoreFile(file);
        if (!res) return null;
        return file;
    }
}