import { Request, Response, NextFunction } from "express";
import { Client } from "@prisma/client";
import dbClient from "../../database/prisma.js";

export interface IRequestWithClient extends Request {
    client: Client;
}

export async function authenticateApiKey(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const apiKey = req.headers["x-api-key"];
        if (!apiKey) {
            res.sendStatus(401);
            return;
        }
    
        const client = await dbClient.client.findUnique({
            where: {
                apiKey: apiKey as string,
            },
        });
    
        if (client) {
            (req as IRequestWithClient).client = client;
            next();
        } else {
            res.sendStatus(401);
        }
    } catch(error) {
        console.error(error);
        res.sendStatus(500);
    }
}
