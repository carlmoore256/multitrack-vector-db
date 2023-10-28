/*
  Warnings:

  - The primary key for the `forum_post` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "forum_post" DROP CONSTRAINT "forum_post_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "forum_post_pkey" PRIMARY KEY ("id");
