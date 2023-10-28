/*
  Warnings:

  - A unique constraint covering the columns `[name,user_id]` on the table `client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "client_datastore_file" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ClientPendingDownload" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPendingDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedDatastoreFile" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "ManagedDatastoreFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_name_user_id_key" ON "client"("name", "user_id");
