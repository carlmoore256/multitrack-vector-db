-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_genre" (
    "artist_id" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,

    CONSTRAINT "artist_genre_pkey" PRIMARY KEY ("artist_id","genre_id")
);

-- CreateTable
CREATE TABLE "artist_resource" (
    "id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,

    CONSTRAINT "artist_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_window" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "sample_start" INTEGER NOT NULL,
    "sample_end" INTEGER NOT NULL,
    "sample_length" INTEGER NOT NULL,
    "time_start" REAL NOT NULL,
    "time_end" REAL NOT NULL,
    "time_length" REAL NOT NULL,
    "normalized_time_start" REAL NOT NULL,
    "normalized_time_end" REAL NOT NULL,
    "normalized_time_length" REAL NOT NULL,
    "clip_index" INTEGER,

    CONSTRAINT "audio_window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datastore_file" (
    "id" TEXT NOT NULL,
    -- "client_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bytes" BIGINT,
    "extension" TEXT,
    "type" TEXT,
    "created_at" DATE,
    "updated_at" DATE,
    "metadata" TEXT,

    CONSTRAINT "datastore_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_post" (
    "id" INTEGER NOT NULL,
    "thread_id" TEXT,
    "author_id" TEXT,
    "username" TEXT,
    "date" TEXT,
    "content" TEXT,
    "attachment_id" TEXT,
    "vector" vector(1536),

    CONSTRAINT "forum_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_thread" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "author" TEXT,
    "author_id" TEXT,
    "replies" INTEGER,
    "views" INTEGER,
    "rating" INTEGER,
    "last_post_date" TEXT,
    "recording_id" TEXT,
    "has_attachment" BOOLEAN,

    CONSTRAINT "forum_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_user" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "joined_date" TEXT,
    "posts_count" INTEGER,
    "threads_count" INTEGER,
    "profile_url" TEXT,

    CONSTRAINT "forum_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sub_genres" TEXT,

    CONSTRAINT "genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vector" vector(1536),

    CONSTRAINT "instrument_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" BIGSERIAL NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multitrack_recording" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "num_tracks" INTEGER NOT NULL,
    "artist_id" TEXT NOT NULL,
    "metadata" TEXT,
    "forum_url" TEXT,

    CONSTRAINT "multitrack_recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multitrack_recording_download" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "bytes" BIGINT,
    "recording_id" TEXT NOT NULL,

    CONSTRAINT "multitrack_recording_download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recording_file" (
    "file_id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,

    CONSTRAINT "recording_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "recording_file_instrument" (
    "file_id" TEXT NOT NULL,
    "instrument_id" TEXT NOT NULL,

    CONSTRAINT "recording_file_instrument_pkey" PRIMARY KEY ("file_id","instrument_id")
);

-- CreateTable
CREATE TABLE "recording_genre" (
    "recording_id" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,

    CONSTRAINT "recording_genre_pkey" PRIMARY KEY ("recording_id","genre_id")
);

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artist_resource" ADD CONSTRAINT "artist_resource_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audio_window" ADD CONSTRAINT "audio_window_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "datastore_file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "forum_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_thread"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording" ADD CONSTRAINT "multitrack_recording_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multitrack_recording_download" ADD CONSTRAINT "multitrack_recording_download_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_file" ADD CONSTRAINT "recording_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "datastore_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_file" ADD CONSTRAINT "recording_file_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_file_instrument" ADD CONSTRAINT "recording_file_instrument_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "recording_file"("file_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_file_instrument" ADD CONSTRAINT "recording_file_instrument_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instrument"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_genre" ADD CONSTRAINT "recording_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recording_genre" ADD CONSTRAINT "recording_genre_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "multitrack_recording"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
