/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `cached_document` will be added. If there are existing duplicate values, this will fail.
  - Made the column `html` on table `cached_document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "cached_document" ADD COLUMN     "label" TEXT,
ALTER COLUMN "html" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cached_document_url_key" ON "cached_document"("url");
