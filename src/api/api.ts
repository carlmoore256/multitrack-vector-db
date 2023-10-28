// run this before any other imports
import dotenv from "dotenv";
dotenv.config();

import { RESTApp } from "./RESTApp.js";
import sync from "./routes/sync.js";
import account from "./routes/account.js";
import client from "./routes/client.js";
import datastore from "./routes/datastore.js";
import admin from "./routes/admin.js";

let origin: string[] = [];
let sslVariables: any = {
    key: "API_SSL_KEY",
    cert: "API_SSL_CERT",
};
let apiUrl = process.env.API_URL as string;

if (process.env.DEV_MODE == "true") {
    origin = [
        "http://127.0.0.1:5500",
        "http://localhost:1234",
        "http://localhost:5173",
    ];
    sslVariables = undefined;
    apiUrl = `http://localhost`;
} else {
    origin = [process.env.CORS_ORIGIN as string];
}

const app = new RESTApp({
    name: "MultitrackVectorDB",
    port: parseInt(process.env.API_PORT as string),
    apiUrl,
    version: process.env.API_VERSION as string,
    sslVariables,
    useJson: true,
    cors: {
        origin,
        credentials: true,
    },
    routes: [sync, account, client, datastore, admin],
});

app.run();
