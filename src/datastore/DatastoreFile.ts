import { IQueryable } from "../database/IQueryable.js";
import { statSync, existsSync } from "fs";
import { getMimeType } from "../utils/files.js";
import path from "path";

export class DatastoreFile implements IQueryable {

    constructor(
        public id : string,
        public path : string,
        public name : string,
        public type : string,
        public bytes : number,
        public extension : string,
        public createdAt : Date,
        public updatedAt : Date,
        public metadata : any
    ) {}       
        
    public static fromDatabaseRow(row : any) : DatastoreFile {
        return new DatastoreFile(
            row.id,
            row.path,
            row.name,
            row.type,
            row.bytes,
            row.extension,
            row.created_at,
            row.updated_at,
            row.metadata,
        );
    }

    public toDatabaseRow() : any {
        return {
            id: this.id,
            path: this.path,
            name: this.name,
            type: this.type,
            bytes: this.bytes,
            extension: this.extension,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            metadata: this.metadata,
        };
    }

    public toDatabaseKVP() : { keys: string[], values: any[] } {
        const row = this.toDatabaseRow();
        const keys = Object.keys(row);
        const values = Object.values(row);
        return { keys, values };
    }

    public toInsertQuery(tableName: string) : { query: string, values: any[] } {
        const { keys, values } = this.toDatabaseKVP();
        const placeholders = keys.map((_, i) => `$${i + 1}`); // this will generate ['$1', '$2', '$3', ...]
        const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`;
        return { query, values };
    }

    public toSelectQuery(tableName: string, idField: string) : { query: string, values: any[] } {
        const { keys, values } = this.toDatabaseKVP();
        const query = `SELECT ${keys.join(', ')} FROM ${tableName} WHERE ${idField}=$1`;
        return { query, values: [this.id] };
    }
    
    public toUpdateQuery(tableName: string, idField: string) : { query: string, values: any[] } {
        const { keys, values } = this.toDatabaseKVP();
        const placeholders = keys.map((key, i) => `${key}=$${i + 2}`); // we start from $2 because $1 is reserved for the id
        const query = `UPDATE ${tableName} SET ${placeholders.join(', ')} WHERE ${idField}=$1`;
        return { query, values: [this.id, ...values] }; // Corrected here
    }
    
    public toDeleteQuery(tableName: string, idField: string) : { query: string, values: any[] } {
        const query = `DELETE FROM ${tableName} WHERE ${idField}=$1`;
        return { query, values: [this.id] };
    }
}




// export abstract class BaseQueryable implements IQueryable {

//     public abstract fromDatabaseRow(row : any) : IQueryable;

//     public abstract toDatabaseRow() : any;

//     public toDatabaseKVP() : { keys: string[], values: any[] } {
    //         const row = this.toDatabaseRow();
//         const keys = Object.keys(row);
//         const values = Object.values(row);
//         return { keys, values };
//     }

//     public abstract toInsertQuery() : { query: string, values: any[] };

//     public abstract toUpdateQuery() : string;

//     public abstract toDeleteQuery() : string;


// public static fromNewFile(params : {
//         id : string,
//         directoryId : string,
//         path : string, 
//         name? : string, 
//         metadata? : any
// }) {
//     const { id, path, name, metadata } = params;
//     if (!existsSync(path)) {
//         throw new Error(`File ${path} does not exist`);
//     }            
//     const stats = statSync(path);
//     const extension = path.split('.').pop();
//     if (!extension) {
//         throw new Error(`File ${path} has no extension`);
//     }
//     const createdAt = new Date(stats.birthtimeMs);
//     const updatedAt = new Date(stats.mtimeMs);
//     return new DatastoreFile(
//         id,
//         path,
//         name || path.split('/').pop() || '',
//         type || 'file',
//         stats.size,
//         extension,
//         createdAt,
//         updatedAt,
//         metadata || {},
//     )
// }
// }