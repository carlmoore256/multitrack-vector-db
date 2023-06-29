

export interface IDatabaseWriteable {
    insertIntoDatabase(db: any): Promise<boolean>;
}