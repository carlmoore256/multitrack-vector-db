import { Router, Request, Response, Handler } from "express";
import bcrypt from "bcrypt";
import { check } from "express-validator";
import { validateMiddleware } from "../middleware/validation.js";
import {
    IRequestWithAccount,
    signJWTCookie,
    authenticateJWTCookie,
} from "../middleware/jwt.js";
import db from "../../database/prisma.js";

const router = Router();
const handleLogin: Handler = async (req, res) => {
    const { email } = req.body;
    // const client = await DB.getUserByUsername(req.body.username);
    const account = await db.account.findUnique({
        where: {
            email: email as string,
        },
    });

    if (!account) {
        res.status(401).send("Invalid email or password");
        return;
    }
    const userInputPassword = req.body.password; // user's input password
    const storedPassword = account.passwordHash; // stored hashed password
    const validPassword = bcrypt.compareSync(userInputPassword, storedPassword);
    if (validPassword) {
        // sign an IUserTokenPayload
        signJWTCookie(
            {
                accountId: account.id,
            },
            "24h",
            res,
            "account"
        );
        res.send({ status: "success" });
    } else {
        res.status(401).send("Invalid email or password");
    }
};

const handleChangePassword: Handler = async (req, res) => {
    try {
        const account = await db.account.findUnique({
            where: {
                id: (req as IRequestWithAccount).account.id,
            },
        });

        if (!account) {
            res.status(401).send("Invalid email or password");
            return;
        }
        const userInputPassword = req.body.password; // user's input password
        const storedPassword = account.passwordHash; // stored hashed password
        const validPassword = bcrypt.compareSync(
            userInputPassword,
            storedPassword
        );
        if (validPassword) {
            const newPassword = req.body.newPassword;
            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            await db.account.update({
                where: {
                    id: (req as IRequestWithAccount).account.id,
                },
                data: {
                    passwordHash: hashedPassword,
                },
            });

            res.send({ status: "success" });
        } else {
            res.status(401).send("Invalid current password");
        }
    } catch (e) {
        res.status(500).send("Internal server error");
    }
};

export default (parent: Router) => {
    parent.use("/account", router);

    router.post(
        "/login",
        check("email").exists().withMessage("email is required").escape(),
        check("password").exists().withMessage("Password is required"),
        validateMiddleware,
        handleLogin
    );

    router.get("/logout", authenticateJWTCookie(), (req, res) => {
        res.clearCookie("userToken");
        res.send({ status: "success" });
    });

    router.post(
        "/change-password",
        authenticateJWTCookie(),
        check("password").exists().withMessage("Password is required"),
        check("newPassword").exists().withMessage("New password is required"),
        handleChangePassword
    );
};
