/*
  Warnings:

  - You are about to drop the `Scope` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `account_scope` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('ADMIN');

-- DropForeignKey
ALTER TABLE "account_scope" DROP CONSTRAINT "account_scope_scope_id_fkey";

-- DropTable
DROP TABLE "Scope";

-- DropTable
DROP TABLE "account_scope";

-- CreateTable
CREATE TABLE "AccountScope" (
    "accountId" TEXT NOT NULL,
    "scope" "Scope" NOT NULL,

    CONSTRAINT "AccountScope_pkey" PRIMARY KEY ("accountId","scope")
);

-- AddForeignKey
ALTER TABLE "AccountScope" ADD CONSTRAINT "AccountScope_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
