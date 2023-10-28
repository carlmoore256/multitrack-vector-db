/*
  Warnings:

  - The primary key for the `ForumThreadCachedDocument` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ForumThreadCachedDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ForumThreadCachedDocument" DROP CONSTRAINT "ForumThreadCachedDocument_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ForumThreadCachedDocument_pkey" PRIMARY KEY ("cached_document_id", "forum_thread_id", "page");
