
export interface IQueryable {
    toDatabaseRow : () => any;
    toDatabaseKVP : () => { keys: string[], values: any[] };
    toInsertQuery : (tableName : string) => { query: string, values: any[] };
    toUpsertQuery : (tableName : string, idField: string) => { query: string, values: any[] };
    toSelectQuery : (tableName : string, idField: string) => { query: string, values: any[] };
    toUpdateQuery : (tableName : string, idField: string) => { query: string, values: any[] };
    toDeleteQuery : (tableName: string, idField: string) => { query: string, values: any[] };
}
