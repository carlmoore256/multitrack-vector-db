import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { Debug } from "../../utils/debug.js";
import dbClient from "../../database/prisma.js";
import { Account } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface ITokenPayload {
    accountId: string; // device id
}

export interface IRequestWithAccount extends Request {
    account: Account;
}

/**
 * Authenticates any type of payload
 */
export function authenticateJWTCookie(cookieName: string = "account") {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies[cookieName];
        if (!token) {
            res.status(500).send("Internal server error");
        }

        if (token) {
            jwt.verify(token, JWT_SECRET, async (err: any, payload: any) => {
                if (err) return res.sendStatus(403);

                const account = await dbClient.account.findUnique({
                    where: {
                        id: (payload as ITokenPayload).accountId,
                    },
                });

                if (!account) {
                    return res.status(400).send("Account not accessible");
                }

                (req as IRequestWithAccount).account = account;

                next();
            });
        } else {
            res.sendStatus(401);
        }
    };
}

export function signJWTCookie(
    payload: ITokenPayload,
    expiresIn: string = "24h",
    res: Response,
    cookieName: string
): string {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
    res.cookie(cookieName, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    });
    return token;
}
