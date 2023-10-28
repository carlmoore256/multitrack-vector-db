-- CreateTable
CREATE TABLE "cached_document" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cached_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumThreadCachedDocument" (
    "id" TEXT NOT NULL,
    "cached_document_id" TEXT NOT NULL,
    "forum_thread_id" TEXT NOT NULL,
    "page" INTEGER NOT NULL,

    CONSTRAINT "ForumThreadCachedDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ForumThreadCachedDocument" ADD CONSTRAINT "ForumThreadCachedDocument_cached_document_id_fkey" FOREIGN KEY ("cached_document_id") REFERENCES "cached_document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ForumThreadCachedDocument" ADD CONSTRAINT "ForumThreadCachedDocument_forum_thread_id_fkey" FOREIGN KEY ("forum_thread_id") REFERENCES "forum_thread"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
