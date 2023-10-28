/*
  Warnings:

  - You are about to drop the `recording_file` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recording_genre` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `client_id` to the `datastore_file` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "artist_genre" DROP CONSTRAINT "artist_genre_artist_id_fkey";

-- DropForeignKey
ALTER TABLE "artist_genre" DROP CONSTRAINT "artist_genre_genre_id_fkey";

-- DropForeignKey
ALTER TABLE "artist_resource" DROP CONSTRAINT "artist_resource_artist_id_fkey";

-- DropForeignKey
ALTER TABLE "audio_window" DROP CONSTRAINT "audio_window_file_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_post" DROP CONSTRAINT "forum_post_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_thread" DROP CONSTRAINT "forum_thread_recording_id_fkey";

-- DropForeignKey
ALTER TABLE "multitrack_recording_download" DROP CONSTRAINT "multitrack_recording_download_recording_id_fkey";

-- DropForeignKey
ALTER TABLE "recording_file" DROP CONSTRAINT "recording_file_file_id_fkey";

-- DropForeignKey
ALTER TABLE "recording_file" DROP CONSTRAINT "recording_file_recording_id_fkey";

-- DropForeignKey
ALTER TABLE "recording_file_instrument" DROP CONSTRAINT "recording_file_instrument_file_id_fkey";

-- DropForeignKey
ALTER TABLE "recording_genre" DROP CONSTRAINT "recording_genre_genre_id_fkey";

-- DropForeignKey
ALTER TABLE "recording_genre" DROP CONSTRAINT "recording_genre_recording_id_fkey";

-- AlterTable
ALTER TABLE "audio_window" ADD COLUMN     "vector" vector(100);

-- AlterTable
ALTER TABLE "datastore_file" ADD COLUMN     "client_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "recording_file";

-- DropTable
DROP TABLE "recording_genre";

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multitrack_recording_genre" (
    "recording_id" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,

    CONSTRAINT "multitrack_recording_genre_pkey" PRIMARY KEY ("recording_id","genre_id")
);

-- CreateTable
CREATE TABLE "multitrack_recording_file" (
    "file_id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,

    CONSTRAINT "multitrack_recording_file_pkey" PRIMARY KEY ("file_id")
);

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artist_resource" ADD CONSTRAINT "artist_resource_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_thread"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_download" ADD CONSTRAINT "multitrack_recording_download_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_genre" ADD CONSTRAINT "multitrack_recording_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_genre" ADD CONSTRAINT "multitrack_recording_genre_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_file" ADD CONSTRAINT "multitrack_recording_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "datastore_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_file" ADD CONSTRAINT "multitrack_recording_file_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_file_instrument" ADD CONSTRAINT "recording_file_instrument_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "multitrack_recording_file"("file_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "datastore_file" ADD CONSTRAINT "datastore_file_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_window" ADD CONSTRAINT "audio_window_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "multitrack_recording_file"("file_id") ON DELETE CASCADE ON UPDATE NO ACTION;
