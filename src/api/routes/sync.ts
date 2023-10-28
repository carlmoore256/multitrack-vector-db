// synchronize files between client and server for user
import { Router, Request, Response } from "express";
import { authenticateApiKey } from "../middleware/auth.js";

const router = Router();

export default (parent: Router) => {
    parent.use("/sync", router);

    router.get("/test", authenticateApiKey, (req, res) => {
        res.send("hello world");
    });
};
