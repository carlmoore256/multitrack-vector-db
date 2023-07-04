import { IQueryable } from "../database/IQueryable.js";
import { DatastoreFile } from "./DatastoreFile.js";

export class DatastoreDirectory implements IQueryable {
    
    constructor(
        public id : string,
        public path : string,
        public name : string,
        public createdAt : Date,
        public updatedAt : Date,
        public files? : DatastoreFile[],
    ) {
        if (!files) {
            this.files = [];
        }
    }

    public static fromDatabaseRow(row : any) : DatastoreDirectory {
        return new DatastoreDirectory(
            row.id,
            row.path,
            row.name,
            row.created_at,
            row.updated_at,
        );
    }

    public toDatabaseRow() : any {
        return {
            id: this.id,
            path: this.path,
            name: this.name,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
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
        const query = `SELECT * FROM ${tableName} WHERE ${idField} = $1`;
        const values = [this.id];
        return { query, values };
    }

    public toUpdateQuery(tableName: string, idField: string) : { query: string, values: any[] } {
        const { keys, values } = this.toDatabaseKVP();
        const placeholders = keys.map((key, i) => `${key}=$${i + 1}`);
        const query = `UPDATE ${tableName} SET ${placeholders.join(', ')} WHERE ${idField}=$${values.length + 1}`;
        values.push(this.id);
        return { query, values };
    }

    public toDeleteQuery(tableName: string, idField: string) : { query: string, values: any[] } {
        const query = `DELETE FROM ${tableName} WHERE ${idField}=$1`;
        return { query, values: [this.id] };
    }
    
}
