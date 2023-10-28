import { Router } from "express";
import { Account } from "@prisma/client";
import db from "../../database/prisma.js";
import { body } from "express-validator";
import { validateMiddleware } from "../middleware/validation.js";
import { validateAccountScopes } from "../middleware/scopes.js";
import { authenticateJWTCookie } from "../middleware/jwt.js";

import bcrypt from "bcrypt";

const router = Router();

export default (parent: Router) => {
    parent.use("/admin", router);

    router.get(
        "/account/all",
        authenticateJWTCookie("account"),
        validateAccountScopes(["ADMIN"]),
        async (req, res) => {
            try {
                const users = await db.account.findMany({});
                res.send(users);
            } catch (err) {
                res.status(500).send(err);
            }
        }
    );

    router.post(
        "/account/create",
        authenticateJWTCookie("account"),
        validateAccountScopes(["ADMIN"]),
        body("email").exists().isEmail().withMessage("email required"),
        body("password").exists().withMessage("password required"),
        validateMiddleware,
        async (req, res) => {
            try {
                const salt = bcrypt.genSaltSync(10);
                const passwordHash = bcrypt.hashSync(req.body.password, salt);
                const user = await db.account.create({
                    data: {
                        email: req.body.email,
                        passwordHash,
                    },
                });
                res.send(user);
            } catch (err) {
                res.status(500).send(err);
            }
        }
    );
};
