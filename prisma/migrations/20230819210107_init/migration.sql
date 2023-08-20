-- AlterTable
ALTER TABLE "audio_window" ALTER COLUMN "time_start" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "time_end" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "time_length" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "normalized_time_start" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "normalized_time_end" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "normalized_time_length" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "datastore_file" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);
