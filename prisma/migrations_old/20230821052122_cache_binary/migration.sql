/*
  Warnings:

  - Changed the type of `html` on the `cached_document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "cached_document" DROP COLUMN "html",
ADD COLUMN     "html" BYTEA NOT NULL;
