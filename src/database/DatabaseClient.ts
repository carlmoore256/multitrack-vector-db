import pg from 'pg';
const { Client } = pg;
import { IGenre, IArtist, IMultitrackRecording, IRecordingDownloadableResource } from '../models/cambridge-models.js';
import { readFileSync } from 'fs';
import { parseColumns, ITableColumn } from './sql-helpers.js';
import { selectPrompt, yesNoPrompt, inputPrompt } from '../cli/cli-promts.js';
import { DatabaseTable } from './DatabaseTable.js';
import { Debug, LogColor } from '../utils/Debug.js';
import dotenv from 'dotenv';
import { table } from 'console';
import { input } from '@inquirer/prompts';
dotenv.config();


export async function parseTables(sql: string, client: DatabaseClient): Promise<{ [key: string]: ITable }> {
    const tableStrings = sql.split(';');
    const tables: { [key: string]: ITable } = {};

    
    for (const cur of tableStrings) {
        const tableName = cur.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (tableName) {
            const name = tableName[1];
            const columns = parseColumns(cur);
            // Debug.log(`trying to create database table ${name}`, LogColor.Yellow);
            // const primaryKey = await client.getPrimaryKeyOfTable(name) || columns[0].key;
            const primaryKey = columns.find(c => c.primary)?.key || columns[0].key;
            const table = new DatabaseTable(client.db, name);
            const createQuery = cur + ';';
            tables[name] = {
                name,
                table,
                createQuery,
                columns,
                primaryKey,
                insert: async (data: any) => table.insert(data),
                insertMany: async (data: any[]) => table.insertMany(data),
                upsert: async (data: any) => table.upsert(data, primaryKey),
                upsertMany: async (data: any[]) => table.upsertMany(data, primaryKey),
                query: async (query: Partial<any>) => table.query(query),
                selectOne: async (query: Partial<any>) => table.selectOne(query),
                getAll: async () => table.getAll(),
                getById: async (id: string) => table.getById(id),
                delete: async (query: Partial<any>) => table.delete(query),
                deleteById: async (id: string) => table.deleteById(id),
                truncate: async () => table.truncate(),
                reset: async () => table.reset(createQuery),
            }
        }
    }
    return tables;
}


interface ITable {
    name: string;
    table: DatabaseTable;
    createQuery: string;
    columns: ITableColumn[],
    primaryKey?: string;
    insert: (data: any) => Promise<any>;
    insertMany: (data: any[]) => Promise<any>,
    upsert: (data: any) => Promise<any>,
    upsertMany: (data: any[]) => Promise<any>,
    query: (query: Partial<any>) => Promise<any[]>,
    selectOne: (query: Partial<any>) => Promise<any>,
    getAll: () => Promise<any[]>,
    getById: (id: string) => Promise<any>,
    delete: (query: Partial<any>) => Promise<boolean>,
    deleteById: (id: string) => Promise<boolean>,
    truncate: () => Promise<void>,
    reset: () => Promise<void>,
}


export class DatabaseClient {
    public db: pg.Client;
    public tables: { [key: string]: ITable } = {};
    public isConnected = false;

    constructor() {
        this.db = new Client({
            user: process.env.PG_USER,
            host: process.env.PG_HOST,
            password: process.env.PG_PASSWORD,
            database: process.env.PG_DATABASE,
        });
    }

    public async connect() {
        await this.db.connect();
        await this.createTables();
        this.isConnected = true;
    }

    public async createTables() {
        try {
            this.tables = await this.loadSchema('./sql/create_tables.sql');
            Object.values(this.tables).forEach(async (table) => {
                // Debug.log(`Creating table ${table.name}`, LogColor.Green);
                await this.db.query(table.createQuery);
            });
            Debug.log("Initialized tables", LogColor.Green);
        } catch (error) {
            throw new Error('Error creating tables: ' + error);
        }
    }

    public async loadSchema(path: './sql/create_tables.sql'): Promise<{ [key: string]: ITable }> {
        const initTables = readFileSync(path, 'utf-8');
        return await parseTables(initTables, this);
    }

    public async disconnect() {
        await this.db.end();
    }

    // initializes the tables and parses the cached html
    async initializeDatabaseDialog() {
        const choice = await selectPrompt<string>([
            { value: 'none', name: "Continue without clearing" },
            { value: 'quit', name: "Quit" },
            { value: 'clear', name: "Clear all Tables" },
            { value: 'reset', name: "Hard reset all Tables" },
        ], "Would you like to clear or reset all tables before proceeding?");

        if (choice === 'clear') {
            await this.clearTables();
        } else if (choice === 'reset') {
            await this.hardResetTables();
        } else if (choice === 'quit') {
            process.exit(0);
        }
    }

    async queryDialog(defaultQuery: string = ''): Promise<null | any> {
        let inputQuery = defaultQuery;
        let query;
        // let usePrevious = false;
        while (true) {
            console.log("\n====== Write your query ======\n\n\n");
            query = await inputPrompt(">", inputQuery);
            let res = null;
            try {
                res = await this.db.query(query);
                if (res.rows.length > 0) {
                    Debug.log(JSON.stringify(res.rows, null, 2) + "\n", LogColor.Green);
                } else {
                    Debug.log("\nNo results\n", LogColor.Red);
                }
            } catch (error) {
                Debug.log("\n" + error + "\n", LogColor.White, 'ERROR', true);
            }

            const choice = await selectPrompt<string>([
                { value: 'confirm', name: "Confirm query (return result)" },
                { value: 'continue', name: "Continue querying" },
                { value: 'new', name: "New query" },
                { value: 'exit', name: "[Exit]" }
            ], "Select an option");

            switch (choice) {
                case 'continue':
                    inputQuery = query;
                    break;
                case 'new':
                    inputQuery = '';
                    break;
                case 'confirm':
                    if (!res || !res?.rows) return [];
                    return res?.rows;
                case 'exit':
                    return;
            }
        }
    }

    public async resetDialog(table: string | null = null) {
        if (!table) {
            // make tables into array of values
            const choices = Object.values(this.tables).map(table => ({ value: table.name, name: table.name }));
            // const choices = Array.from(this.tables.values);
            table = await selectPrompt<string>([
                { value: 'exit', name: "[Exit]" },
                ...choices
            ], "Select a table to reset");
            if (table === 'exit') {
                return;
            }
        }

        const resetChoice = await selectPrompt<string>([
            { value: 'exit', name: "[Exit]" },
            { value: 'truncate', name: "Truncate table (clear records)" },
            { value: 'reset', name: "Hard reset (delete and re-create)" },
        ], "Select a reset type");

        let confirm = false;
        switch (resetChoice) {
            case 'exit':
                return;
            case 'clear':
                confirm = await yesNoPrompt(`Truncate table ${table}?`);
                if (confirm) await this.tables[table].truncate();
                Debug.log(`Table ${table} truncated`, LogColor.Green);
                break;
            case 'reset':
                confirm = await yesNoPrompt(`Hard reset table ${table}?`);
                if (confirm) await this.tables[table].reset();
                Debug.log(`Table ${table} reset`, LogColor.Green);
                break;
        }
    }

    public async databaseBrowserDialog() {
        const choices = Object.values(this.tables).map(table => ({ value: table.name, name: table.name }));
        while (true) {
            const choice = await selectPrompt<string>([
                { value: 'exit', name: "[Exit]" },
                ...choices
            ], "Select a table to browse");
            if (choice === 'exit') {
                return;
            }
            // const table = this.tables[choice];
            await this.tableBrowserDialog(choice);

            const res = await this.db.query(`SELECT * FROM ${choice} LIMIT 10;`);
            if (res.rows.length > 0) {
                Debug.log(JSON.stringify(res.rows, null, 2) + "\n", LogColor.Green);
            } else {
                Debug.log("\nNo results\n", LogColor.Red);
            }
        }
    }

    public async tableBrowserDialog(tableName: string) {
        while (true) {
            const choice = await selectPrompt<string>([
                { value: 'testQuery', name: "Run Test Query" },
                { value: 'reset', name: "Reset Table" },
                { value: 'primaryKey', name: "Get Primary Key" },
                { value: 'exit', name: "[Exit]" },
            ], `Select an option for table ${tableName}`);
            switch (choice) {
                case 'testQuery':
                    await this.testQueryDialog(tableName);
                    break;
                case 'reset':
                    await this.resetDialog(tableName);
                    break;
                case 'primaryKey':
                    const primaryKey = await this.getPrimaryKeyOfTable(tableName);
                    Debug.log(`Primary key of table ${tableName} is [${primaryKey}]`, LogColor.Red);
                    break;
                case 'exit':
                    return;
            }
        }
    }

    public async testQueryDialog(tableName: string) {
        const query = `SELECT * FROM ${tableName} LIMIT 10;`;
        if (!query) {
            Debug.log(`No test query for table ${tableName}`, LogColor.Red);
            return;
        }
        try {
            const res = await this.db.query(query);
            if (res.rows.length > 0) {
                Debug.log(JSON.stringify(res.rows, null, 2) + "\n", LogColor.Green);
            } else {
                Debug.log("\nNo results\n", LogColor.Red);
            }
        } catch (error) {
            Debug.log("\n" + error + "\n", LogColor.White, 'ERROR', true);
        }
    }

    public async clearTableDialog(tableName: string) {
        const table = this.tables[tableName];
        const confirm = await yesNoPrompt(`Reset table ${tableName}?`);
        if (confirm) {
            await this.db.query(`TRUNCATE TABLE ${tableName} CASCADE;`);
            Debug.log(`Table ${tableName} reset`, LogColor.Green);
        }
    }

    public async updateTable(tableName: string) {
        const table = this.tables[tableName];

    }

    public async deleteTables(tableNames: string[] | null = null) {
        if (!tableNames) tableNames = Object.values(this.tables).map(table => table.name);
        const choice = await yesNoPrompt(`Are you sure you want to delete data in the following tables? (cascade) \n${tableNames}`);
        if (!choice) {
            throw new Error("Delete all tables cancelled");
        }
        try {
            for (const table of tableNames) {
                console.log(`Deleting table ${table}...`)
                await this.db.query(`DROP TABLE ${table} CASCADE;`);
            }

            console.log('Tables deleted successfully.');
        } catch (error) {
            console.error('Error deleting tables:', error);
        }
    }

    public async hasEntries(tableName: string) {
        const res = await this.db.query(`SELECT EXISTS (SELECT 1 FROM ${tableName});`);
        return res.rows[0].exists;
    }


    public async hardResetTables(tableNames: string[] | null = null) {
        if (!tableNames) tableNames = Object.values(this.tables).map(table => table.name);
        console.log("Hard resetting database...");
        await this.deleteTables(tableNames);
        await this.createTables();
    }

    public async clearTables(tableNames: string[] | null = null) {
        if (!tableNames) tableNames = Object.values(this.tables).map(table => table.name);
        const choice = await yesNoPrompt("Are you sure you want to truncate/clear every table?");
        if (!choice) {
            throw new Error("Truncate/clear all tables cancelled");
        }
        try {
            for (const table of tableNames) {
                console.log(`Clearing table ${table}...`)
                await this.db.query(`TRUNCATE TABLE ${table} CASCADE;`);
            }

            console.log('Tables cleared and reset successfully.');
        } catch (error) {
            console.error('Error clearing tables:', error);
        }
    }


    public async query(query: string, params?: any[]): Promise<pg.QueryResult<any[]>> {
        const res = await this.db.query(query, params);
        return res;
    }

    /**
     * Queries a table with a query object
     */
    public async queryTable(tableName: string, queryObject: any) {
        const table = this.tables[tableName];
        return await table.query(queryObject);
    }

    public async queryRows(query: string, params?: any[]): Promise<any[] | null> {
        const res = await this.db.query(query, params);
        if (res.rows.length > 0) {
            return res.rows;
        }
        return null;
    }

    public async insert(tableName: string, item: any): Promise<boolean> {
        const table = this.tables[tableName];
        return await table.insert(item);
    }

    public async upsert(tableName: string, item: any): Promise<boolean> {
        const table = this.tables[tableName];
        return await table.upsert(item);
    }

    public async insertMany(tableName: string, items: any[]): Promise<boolean> {
        const table = this.tables[tableName];
        return await table.insertMany(items);
    }

    public async upsertMany(tableName: string, items: any[]): Promise<boolean> {
        const table = this.tables[tableName];
        return await table.upsertMany(items);
    }

    public async selectOne(tableName: string, query: any): Promise<any> {
        // const table = new DatabaseTable(this.db, tableName);
        const table = this.tables[tableName];
        return await table.selectOne(query);
    }

    public async getById(tableName: string, id: string): Promise<any> {
        // const table = new DatabaseTable(this.db, tableName);
        const table = this.tables[tableName];
        return await table.getById(id);
    }

    public async create(tableName: string, item: any) {
        // const table = new DatabaseTable(this.db, tableName);
        const table = this.tables[tableName];
        const res = await table.insert(item);
        if (!res) {
            throw new Error("Failed to create item");
        } else {
            console.log("Created item");
        }
    }

    public async getPrimaryKeyOfTable(tableName: string): Promise<string | null> {
        const res = await this.db.query(`
            SELECT a.attname
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = '${tableName}'::regclass
            AND    i.indisprimary;
        `);
        if (res.rows.length === 0) {
            return null;
        }
        return res.rows[0].attname;
    }

    public async queryType<T>(tableName: string, query: Partial<T>): Promise<T[]> {
        const databaseTable = new DatabaseTable(this.db, tableName);
        return await databaseTable.query(query) as T[];
    }
}

export default DatabaseClient;