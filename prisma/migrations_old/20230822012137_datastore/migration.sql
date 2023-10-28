/*
  Warnings:

  - You are about to drop the `datastore_file` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "datastore_file" DROP CONSTRAINT "datastore_file_client_id_fkey";

-- DropForeignKey
ALTER TABLE "multitrack_recording_file" DROP CONSTRAINT "multitrack_recording_file_file_id_fkey";

-- DropTable
DROP TABLE "datastore_file";

-- CreateTable
CREATE TABLE "client_datastore_file" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bytes" BIGINT,
    "extension" TEXT,
    "type" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "is_synced" BOOLEAN,
    "last_synced_at" TIMESTAMP(3),
    "metadata" TEXT,

    CONSTRAINT "client_datastore_file_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "multitrack_recording_file" ADD CONSTRAINT "multitrack_recording_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "client_datastore_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_datastore_file" ADD CONSTRAINT "client_datastore_file_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
