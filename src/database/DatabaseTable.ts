import { Client } from "pg";
import Debug from "../utils/Debug.js";
import { clear } from "console";

export class DatabaseTable {
  private tableName: string;
  private db: Client;

  constructor(db: Client, tableName: string) {
    this.tableName = tableName;
    this.db = db;
  }

  public async insert(item: any): Promise<any> {
    const keys = Object.keys(item);
    const values: any[] = [];
    const placeholders = keys.map((key, i) => {
      const value = item[key];
      if (Array.isArray(value)) {
        // Create array constructor for array types
        const arrayPlaceholders = value.map((_, j) => `$${values.length + j + 1}`).join(", ");
        values.push(...value);
        return `ARRAY[${arrayPlaceholders}]`;
      } else {
        values.push(value);
        return `$${i + 1}`;
      }
    });

    const keysString = keys.join(", ");
    const placeholdersString = placeholders.join(", ");
    // Debug.log(`DatabaseTable.ts: RUNNING QUERY | INSERT INTO ${this.tableName} (${keysString}) VALUES (${placeholdersString}) | ${values}`)

    const res = await this.db.query(`INSERT INTO ${this.tableName} (${keysString}) VALUES (${placeholdersString});`, values);
    if (res.rowCount === 0) {
      return false;
    }
    return res;
  }

  public async insertMany(items: any[]): Promise<any> {
    // return a promise for all to insert
    return Promise.all(items.map(async (item) => {
      return this.insert(item);
    }));
  }


  public async upsert(item: any, conflictKey: string): Promise<any> {
    const keys = Object.keys(item);
    const values: any[] = [];
    const placeholders = keys.map((key, i) => {
      const value = item[key];
      if (Array.isArray(value)) {
        // Create array constructor for array types
        const arrayPlaceholders = value.map((_, j) => `$${values.length + j + 1}`).join(", ");
        values.push(...value);
        return `ARRAY[${arrayPlaceholders}]`;
      } else {
        values.push(value);
        return `$${i + 1}`;
      }
    });

    const keysString = keys.join(", ");
    const placeholdersString = placeholders.join(", ");
    const onConflictUpdateString = keys.map((key, i) => `${key}=EXCLUDED.${key}`).join(", ");

    // Debug.log(`DatabaseTable.ts: RUNNING QUERY | INSERT INTO ${this.tableName} (${keysString}) VALUES (${placeholdersString}) ON CONFLICT (${conflictKey}) DO UPDATE SET ${onConflictUpdateString} | ${values}`);

    const res = await this.db.query(`INSERT INTO ${this.tableName} (${keysString}) VALUES (${placeholdersString}) ON CONFLICT (${conflictKey}) DO UPDATE SET ${onConflictUpdateString};`, values);
    if (res.rowCount === 0) {
      return false;
    }
    return res;
  }

  public async upsertMany(items: any[], conflictKey: string): Promise<any> {
    // return a promise for all to insert
    return Promise.all(items.map(async (item) => {
      return this.upsert(item, conflictKey);
    }));
  }


  // public async insert(item: any) : Promise<any> {
  //   const keys = Object.keys(item as any);
  //   const values = Object.values(item as any);
  //   const keysString = keys.join(", ");
  //   const valuesPlaceholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  //   Debug.log(`DatabaseTable.ts: RUNNING QUERY | INSERT INTO ${this.tableName} (${keysString}) VALUES (${valuesPlaceholders}) | ${values}`)
  //   const res = await this.db.query(`INSERT INTO ${this.tableName} (${keysString}) VALUES (${valuesPlaceholders});`, values);
  //   if (res.rowCount === 0) {
  //     return false;
  //   }
  //   return res;
  // }

  public async getById(id: string): Promise<any> {
    const res = await this.db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  }

  public async query(query: Partial<any>): Promise<any[]> {
    const queryParams = Object.entries(query);
    const queryText = `SELECT * FROM ${this.tableName} WHERE ${queryParams.map(([key, _], i) => `${key} = $${i + 1}`).join(" AND ")}`;

    const queryValues = queryParams.map(([, value]) => value);

    const res = await this.db.query(queryText, queryValues);
    return res.rows;
  }

  public async selectOne(query: Partial<any>): Promise<any | null> {
    const queryParams = Object.entries(query);
    const queryText = `SELECT * FROM ${this.tableName} WHERE ${queryParams.map(([key, _], i) => `${key} = $${i + 1}`).join(" AND ")}`;

    const queryValues = queryParams.map(([, value]) => value);

    const res = await this.db.query(queryText, queryValues);
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  }

  public async getAll(): Promise<any[]> {
    const res = await this.db.query(`SELECT * FROM ${this.tableName}`);
    return res.rows;
  }

  public async deleteById(id: string): Promise<boolean> {
    const res = await this.db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    if (res.rowCount === 0) {
      return false;
    }
    return true;
  }

  public async delete(query: Partial<any>): Promise<boolean> {

    const queryParams = Object.entries(query);
    const queryText = `DELETE FROM ${this.tableName} WHERE ${queryParams.map(([key, _], i) => `${key} = $${i + 1}`).join(" AND ")}`;

    const queryValues = queryParams.map(([, value]) => value);
    const res = await this.db.query(queryText, queryValues);
    if (res.rowCount === 0) {
      return false;
    }
    return true;
  }

  // truncate
  public async truncate(): Promise<void> {
    await this.db.query(`TRUNCATE TABLE ${this.tableName}`);
  }

  public async reset(createSQL : string) : Promise<void> {
    await this.db.query(`DROP TABLE IF EXISTS ${this.tableName} CASCADE`);
    await this.db.query(createSQL);
  }
}

