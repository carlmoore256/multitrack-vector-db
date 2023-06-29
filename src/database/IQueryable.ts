
import { Client } from "pg";
import { GenericDatabaseTable } from "./GenericDatabaseTable.js";

export interface IQueryable<T> {
    tableName: string;
    getQueryable(): T;
    // getDatabaseTable(db : Client): DatabaseTable<T>;
}

