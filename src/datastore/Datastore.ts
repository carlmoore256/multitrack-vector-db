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
import { flattenDir } from "../utils/files.js";

import path from "path";

// export interface IDatastore

// handles storing/recalling any DatastoreFile
export class Datastore {

    public idGenerator = (data : string) => generateHashId(data, 16);

    constructor(
        public dbClient: DatabaseClient,
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
            Debug.logError(`Storage root does not exist: ${path.resolve(this.storageRoot)}`);
            const res = await yesNoPrompt(`Datastore root ${this.storageRoot} does not exist. Create directory?`);
            // console.log(res);
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

        const allIds = await this.dbClient.queryRows(`SELECT id FROM ${this.tableName}`);

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
                notInStorage.forEach((record: any) => {
                    this.dbClient.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [record.id]);
                });
                // 
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
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const values = [this.tableName, id];
        const res = await this.dbClient.queryRows(query, values);
        if (!res) return null;
        return DatastoreFile.fromDatabaseRow(res[0]);
    }

    
    // public getPathFromId(id : string) {
    //     return path.resolve(this.storageRoot, id);
    // }
    
    public getDirectoryFromId(id : string) {
        return path.resolve(this.storageRoot, id);
        // return path.dirname(this.getPathFromId(id));
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


        // if file isn't already in the path, move it to there
        if (!originalPath.includes(this.storageRoot)) {
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
        // if (directoryId == null) {
        //     // CHANGE ME, use some meaningful contents
        // }       
        // directoryId = this.idGenerator(zipFilePath);

        // const dir = directoryId ? path.resolve(this.storageRoot, directoryId) : this.storageRoot;
        const outputDir = this.getDirectoryFromId(directoryId);
        checkMakeDir(outputDir);
        
        let paths = await unzipIntoDirectory(zipFilePath, outputDir);
        if (!paths) {
            Debug.logError(`Error unzipping file: ${zipFilePath}`);
            return null
        }

        // const fullDir = path.resolve(this.storageRoot, directoryId);
        // if ()
        flattenDir(outputDir);
        let originalFilenames = paths.map(p => path.basename(p));
        // make sure that we only return the files that have just been added
        paths = readdirSync(outputDir).filter(p => originalFilenames.includes(path.basename(p)));

        const datastoreFiles = paths.map(p => {
            return this.datastoreFileFromPath({
                originalPath: path.join(outputDir, p),
                directoryId,
                id: this.idGenerator(p)
            });
        });

        const insertQueries = datastoreFiles.map(f => f.toInsertQuery(this.tableName));

        insertQueries.forEach(q => {
            Debug.log(`Inserting file: ${q.query}`);
            this.dbClient.query(q.query, q.values);
        });

        // add all the files to the database
        // this.dbClient.insertMany(this.tableName, datastoreFiles.map(f => f.toInsertQuery(this.tableName)));

        Debug.logError(`Removing downloaded file: ${zipFilePath}`);
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
