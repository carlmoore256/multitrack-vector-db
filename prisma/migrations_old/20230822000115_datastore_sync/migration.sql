-- AlterTable
ALTER TABLE "datastore_file" ADD COLUMN     "is_synced" BOOLEAN,
ADD COLUMN     "last_synced_at" TIMESTAMP(3);
