import { Client } from "pg";

export class GenericDatabaseTable<T> {
    private tableName: string;
    private db: Client;
  
    constructor(db: Client, tableName: string) {
      this.tableName = tableName;
      this.db = db;
    }
  
    public async create(item: T) {
      const keys = Object.keys(item as any);
      const values = Object.values(item as any);
      const keysString = keys.join(", ");
      const valuesPlaceholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  
      const res = await this.db.query(`INSERT INTO ${this.tableName} (${keysString}) VALUES (${valuesPlaceholders})`, values);
    }
  
    public async getById(id: string): Promise<T> {
      const res = await this.db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
      return res.rows[0] as T;
    }
  
    public async query(query: Partial<T>): Promise<T[]> {
      const queryParams = Object.entries(query);
      const queryText = `SELECT * FROM ${this.tableName} WHERE ${queryParams.map(([key, _], i) => `${key} = $${i + 1}`).join(" AND ")}`;
  
      const queryValues = queryParams.map(([, value]) => value);
  
      const res = await this.db.query(queryText, queryValues);
      return res.rows as T[];
    }
  
    public async getAll(): Promise<T[]> {
      const res = await this.db.query(`SELECT * FROM ${this.tableName}`);
      return res.rows as T[];
    }
  
    public async deleteById(id: string): Promise<void> {
      await this.db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    }
  }
  