/*
  Warnings:

  - Changed the type of `type` on the `multitrack_recording_download` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MultitrackDownloadType" AS ENUM ('MULTITRACK', 'PREVIEW', 'FORUM', 'OTHER');

-- AlterTable
ALTER TABLE "multitrack_recording_download" DROP COLUMN "type",
ADD COLUMN     "type" "MultitrackDownloadType" NOT NULL;
