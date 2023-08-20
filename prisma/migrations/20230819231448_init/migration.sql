/*
  Warnings:

  - Made the column `url` on table `forum_thread` required. This step will fail if there are existing NULL values in that column.
  - Made the column `author` on table `forum_thread` required. This step will fail if there are existing NULL values in that column.
  - Made the column `author_id` on table `forum_thread` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recording_id` on table `forum_thread` required. This step will fail if there are existing NULL values in that column.
  - Made the column `has_attachment` on table `forum_thread` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "forum_thread" ALTER COLUMN "url" SET NOT NULL,
ALTER COLUMN "author" SET NOT NULL,
ALTER COLUMN "author_id" SET NOT NULL,
ALTER COLUMN "recording_id" SET NOT NULL,
ALTER COLUMN "has_attachment" SET NOT NULL,
ALTER COLUMN "has_attachment" SET DEFAULT false;
