import dbClient from "../database/prisma.js";
import { Account } from "@prisma/client";
import { inputPrompt } from "../cli/cli-promts.js";
import bcrypt from "bcrypt";
import { Debug } from "../utils/debug.js";

export async function createAccount(
    email: string,
    password: string
): Promise<Account> {
    const passwordHash = bcrypt.hashSync(password, 10);
    const account = await dbClient.account.create({
        data: {
            email,
            passwordHash,
        },
    });
    return account;
}

async function createAccountCLI() {
    Debug.log("Create New Account");
    const email = await inputPrompt("Email: ");
    const password = await inputPrompt("Password: ");
    const account = await createAccount(email, password);
    console.log(account);
}

if (process.argv.includes("--cli")) {
    createAccountCLI();
}
