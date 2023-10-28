// synchronize files between client and server for user
import { Router, Request, Response, Handler } from "express";
import {
    authenticateApiKey,
    IRequestWithClient,
} from "../middleware/auth.js";
import { validateMiddleware } from "../middleware/validation.js";
import { body } from "express-validator";
import dbClient from "../../database/prisma.js";

const router = Router();

const handleClientSync: Handler = async (req, res) => {
    try {
        const { client } = req as IRequestWithClient;
        const account = await dbClient.account.findUnique({
            where: {
                id: client.userId,
            },
        });
        if (!account) {
            res.sendStatus(401);
            return;
        }

        const clientLastSyncTime = new Date(req.body.lastSyncTime);

        // send back the client a json object containing the datastore files it needs to sync
        const datastoreFiles = await dbClient.clientDatastoreFile.findMany({
            where: {
                isSynced: false,
                client: {
                    id: client.id,
                },
            },
        });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

const handleCreateFile: Handler = async (req, res) => {
    try {
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

const handleGetFile: Handler = async (req, res) => {
    try {
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

const handleGetPendingDownloads: Handler = async (req, res) => {
    try {
        // send the client a url, and something to resolve it once its done

    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

// these are routes that the client will call to synchronize
// their datastore with the database
export default (parent: Router) => {
    parent.use("/datastore", router);

    router.get("/sync", authenticateApiKey, handleClientSync);

    // we have the concept of a "ManagedFile" that the server either 
    // sends directly to the client or has them download

    // then an "UnmanagedFile" that the client adds to the datastore, 
    // and can optionally add info about

    // managed files can have some metadata associated with them that allows us to join them with other data
    router.get("/managed/");

    router.get(
        "/downloads/pending",
        authenticateApiKey,
        handleGetPendingDownloads
    );

    router.post("/file/create",
        body("datastoreFile").exists(),
        
        authenticateApiKey, 
        handleCreateFile);

    router.get("/file/:fileId", authenticateApiKey, handleGetFile);

    // client can ask for pending downloads
    // server gives them multitrackRecordingDownload
};
