import { DataSource } from "typeorm";
import { OpenAI } from "langchain/llms/openai";
import { SqlDatabase } from "langchain/sql_db";
import { SqlDatabaseChain } from "langchain/chains/sql_db";
import dotenv from "dotenv";
dotenv.config();

const datasource = new DataSource({
    type: "postgres",
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT as string),
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
});

const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
    // includesTables: ["artist"]
});

const llm = new OpenAI({ 
    temperature: 0,
    // modelName: "gpt-3.5-turbo-16k",
    // modelName: "gpt-3.5-turbo",
    verbose: true
});

const chain = new SqlDatabaseChain({
    llm,
    database: db,
});

const res = await chain.run("What are the most popular tracks? NEVER do a `SELECT *`, make sure to ALWAYS exclude any column with `vector` in the name.");
console.log(res);
// There are 3503 tracks.
