import https from 'https';
import { ServerOptions } from 'https';
import express, { Request, Response, NextFunction, Express, json, Router, Handler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { readFileSync } from 'fs';
dotenv.config();

type APIRoute = (route : Router) => void;

// provides the keys to the env to resolve the key and cert
// NOTE - these are NOT the actual keys, but the environment variables
interface SSLVariables {
    key: string;
    cert: string;
}

export interface CorsOptions {
    useCors: boolean;
    corsOptions?: cors.CorsOptions;
}

export interface RESTAppParameters {
    name: string;
    apiUrl: string;
    port: number;
    routes: APIRoute[];
    sslVariables?: SSLVariables;
    version?: string;
    cors?: cors.CorsOptions;
    useJson?: boolean;
}


const getHTTPSOptions = (sslVariables : SSLVariables) : ServerOptions => {
    const sslKeyFile = process.env[sslVariables.key];
    const sslCertFile = process.env[sslVariables.cert];
    if (!sslKeyFile || !sslCertFile) {
        throw new Error("SSL_KEY and SSL_CERT must be defined in the environment");
    }
    return {
        key: readFileSync(sslKeyFile).toString(),
        cert: readFileSync(sslCertFile).toString()
    }
}

// const corsOptions = {
//     origin: ['http://127.0.0.1:5500', 'http://localhost:1234', 'https://carlmoorexyz-dev.web.app/', 'https://woahverse.com'],
//     credentials: true
// }

export class RESTApp {

    parameters : RESTAppParameters;
    app : Express;
    private server? : https.Server;

     constructor(parameters : RESTAppParameters) {
        this.parameters = parameters;
        this.app = express();
        this.app.use(cookieParser());
        
        if (this.parameters.useJson) {
            this.app.use(json());
        }
        if (this.parameters.cors) {
            this.app.use(cors(this.parameters.cors));
        }
        this.app.use(this.logMiddleware.bind(this));

        const router = Router();
        this.parameters.routes.forEach(route => route(router));

        if (this.parameters.version) {
            this.app.use(this.parameters.version, router);
        } else {
            this.app.use(router);
        }
        

        
        // Use error handler after all other middlewares and routes
        this.app.use(this.errorHandler.bind(this));

    }

    getURL() {
        var url = this.parameters.apiUrl + ":" + this.parameters.port;
        if (this.parameters.version) {
            url += this.parameters.version;
        }
        return url;
    }

    run() {
        this.log(`Starting API Application ${this.parameters.name} at ${this.getURL()}`);
        if (!this.parameters.sslVariables) {
            this.log("WARNING: SSL variables not provided, running in insecure mode");
            this.app.listen(this.parameters.port, () => {
                this.log(`Server is running at ${this.getURL()}`);
            });
            return;
        }
        this.server = https.createServer(getHTTPSOptions(this.parameters.sslVariables), this.app).listen(this.parameters.port, () => {
            this.log(`Server is running at ${this.getURL()}`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                this.log(`Server ${this.parameters.name} stopped`);
            });
            this.server = undefined;
        }
    }

    private errorHandler(err : any, req : Request, res : Response, next : NextFunction) {
        res.status(err.statusCode || 500).send({ "error" : err.message });
    }

    private log(message : string) {
        console.log(`[${this.parameters.name}] ${message}`);
    }

    private logMiddleware(req : Request, res : Response, next : NextFunction) {
        this.log(`=> ${req.method} | ${req.url}`);
        next();
    }
}