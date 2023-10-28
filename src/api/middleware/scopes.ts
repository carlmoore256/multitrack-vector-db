import { Request, Response, NextFunction } from "express";
import db from "../../database/prisma.js";
import { Scope } from "@prisma/client";

import { IRequestWithAccount } from "./jwt.js";

export function validateAccountScopes(scopes: Scope[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const account = await db.account.findUnique({
                where: {
                    id: (req as IRequestWithAccount).account.id,
                },
                include: {
                    accountScope: true,
                },
            });

            if (!account) {
                return res.status(404).send("Account not found");
            }

            const accountScopes = account.accountScope.map((x) => x.scope);

            const hasAllScopes = scopes.every((s) => accountScopes.includes(s));

            if (!hasAllScopes) {
                return res.status(403).send("Insufficient scopes");
            }

            next();
        } catch (err) {
            return res.status(500).send("Internal server error");
        }
    };
}
