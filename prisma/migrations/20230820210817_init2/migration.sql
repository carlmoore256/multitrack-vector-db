/*
  Warnings:

  - The `sub_genres` column on the `genre` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metadata` column on the `multitrack_recording` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "genre" DROP COLUMN "sub_genres",
ADD COLUMN     "sub_genres" JSONB;

-- AlterTable
ALTER TABLE "multitrack_recording" DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB;
