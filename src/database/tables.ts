import Database from "better-sqlite3"; 
// import sqlite_vss from "sqlite-vss";
import * as sqlite_vss from "sqlite-vss";

import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const CREATE_TABLES_PATH = "./sql/create_tables.sql";

function test() {
    // let sqlite_vss: any;
    const db = new Database(":memory:");
    sqlite_vss.load(db);
    // import("sqlite-vss").then((module) => {
    //     console.log(module);
    //     sqlite_vss = module.default || module;
    //     // const db = new Database(process.env.DATABASE_PATH as string); // replace with your database file
    //     const db = new Database(process.env.DATABASE_PATH as string); // replace with your database file
    //     // db.loadExtension(sqlite_vss.getVssLoadablePath());
    //     // sqlite_vss.load(db);
    //     // const version = db.prepare("select vss_version()").pluck().get();
    //     // console.log(version);
    //     const sqlStatements = readFileSync(CREATE_TABLES_PATH, "utf-8");
    //     db.exec(sqlStatements);
    //     console.log("Created tables.");
    // });
}

export default test;