/*
  Warnings:

  - A unique constraint covering the columns `[name,artist_id]` on the table `multitrack_recording` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "multitrack_recording_name_artist_id_key" ON "multitrack_recording"("name", "artist_id");
