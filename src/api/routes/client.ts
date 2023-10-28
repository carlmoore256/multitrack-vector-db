// synchronize files between client and server for user
import { Router, Request, Response, Handler } from "express";
import { validateMiddleware } from "../middleware/validation.js";
import {
    authenticateJWTCookie,
    IRequestWithAccount,
} from "../middleware/jwt.js";
import { check } from "express-validator";
import db from "../../database/prisma.js";
import { randomBytes } from "crypto";
import { authenticateApiKey } from "../middleware/auth.js";

const router = Router();

const handleCreateClient: Handler = async (req, res) => {
    try {
        const apiKey = randomBytes(32).toString("hex");
        const { name } = req.body;
        const client = await db.client.create({
            data: {
                name,
                apiKey,
                account: {
                    connect: {
                        id: (req as IRequestWithAccount).account.id,
                    },
                },
            },
        });

        res.set(201).send({ client });
    } catch (err) {
        res.status(500).send("Internal server error");
    }
};

export default (parent: Router) => {
    parent.use("/client", router);

    router.post(
        "/create",
        authenticateJWTCookie(),
        check("name").exists().withMessage("name for client required"),
        validateMiddleware,
        handleCreateClient
    );

    router.get("/list", authenticateJWTCookie(), async (req, res, next) => {
        try {
            const clients = await db.client.findMany({
                where: {
                    userId: (req as IRequestWithAccount).account.id,
                },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                },
            });
            res.send(clients);
        } catch (err) {
            next(err);
        }
    });

    router.get("/valid-key", authenticateApiKey, async (req, res) => {
        res.send("OK");
    });
};
