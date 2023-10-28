/*
  Warnings:

  - A unique constraint covering the columns `[api_key]` on the table `client` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "client_api_key_key" ON "client"("api_key");
