import { PrismaClient } from "@prisma/client"

export interface IDatabaseWriteable<T> {
    // insertIntoDatabase(db: any): Promise<boolean>;
    insertIntoDatabase(client: PrismaClient): Promise<T | null>;
}