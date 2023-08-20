/*
  Warnings:

  - The primary key for the `genre` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `genre` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "artist_genre" DROP CONSTRAINT "artist_genre_genre_id_fkey";

-- DropForeignKey
ALTER TABLE "multitrack_recording_genre" DROP CONSTRAINT "multitrack_recording_genre_genre_id_fkey";

-- AlterTable
ALTER TABLE "genre" DROP CONSTRAINT "genre_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "genre_pkey" PRIMARY KEY ("name");

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("name") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_genre" ADD CONSTRAINT "multitrack_recording_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("name") ON DELETE CASCADE ON UPDATE NO ACTION;
