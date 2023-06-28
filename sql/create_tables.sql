
CREATE TABLE IF NOT EXISTS genre (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subGenres TEXT
);

CREATE TABLE IF NOT EXISTS artist (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- represents an entire recording session with many multitrack_files
CREATE TABLE IF NOT EXISTS mutltitrack_recording (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    numTracks INTEGER NOT NULL,
    artistId TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY(artistId) REFERENCES artist(id)
);

-- junction table to form a many-to-many relationship between genre and artist
-- because artist may have many genres, and genres aren't associated directly
-- with artists
CREATE TABLE IF NOT EXISTS artist_genre (
    artistId TEXT NOT NULL,
    genreId TEXT NOT NULL,
    FOREIGN KEY(artistId) REFERENCES artist(id),
    FOREIGN KEY(genreId) REFERENCES genre(id)
);

-- represents a single file associated with a mutltitrack_recording
CREATE TABLE IF NOT EXISTS audio_file (
    id TEXT PRIMARY KEY,
    uri TEXT NOT NULL,
    name TEXT NOT NULL,
    tags TEXT,
    bytes INTEGER,
    metadata TEXT,
    recordingId TEXT NOT NULL,
    FOREIGN KEY(recordingId) REFERENCES mutltitrack_recording(id)
);


-- a junction table for a genre assigned to a recording, because it's a many-to-many
-- relationship, since each recording can have multiple genres
CREATE TABLE IF NOT EXISTS recording_genre (
    recordingId TEXT NOT NULL,
    genreId TEXT NOT NULL,
    PRIMARY KEY(recordingId, genreId),
    FOREIGN KEY(recordingId) REFERENCES mutltitrack_recording(id),
    FOREIGN KEY(genreId) REFERENCES genre(id)
);

CREATE TABLE IF NOT EXISTS recording_file (
    recordingId TEXT NOT NULL,
    fileId TEXT NOT NULL,
    FOREIGN KEY(recordingId) REFERENCES mutltitrack_recording(id),
    FOREIGN KEY(fileId) REFERENCES audio_file(id)
);

CREATE TABLE IF NOT EXISTS forum_thread (
    id INTEGER PRIMARY KEY,
    url TEXT,
    title TEXT,
    author TEXT,
    replies INTEGER,
    views INTEGER,
    rating INTEGER,
    lastPostDate DATE,
    recordingId TEXT,
    hasAttachment BOOLEAN,
    FOREIGN KEY(recordingId) REFERENCES mutltitrack_recording(id)
);


CREATE TABLE IF NOT EXISTS audio_window (
    id TEXT PRIMARY KEY,
    fileId TEXT NOT NULL,
    sampleStart INTEGER NOT NULL,
    sampleEnd INTEGER NOT NULL,
    sampleLength INTEGER NOT NULL,
    timeStart REAL NOT NULL,
    timeEnd REAL NOT NULL,
    timeLength REAL NOT NULL,
    normalizedTimeStart REAL NOT NULL,
    normalizedTimeEnd REAL NOT NULL,
    normalizedTimeLength REAL NOT NULL,
    clipIndex INTEGER,
    FOREIGN KEY(fileId) REFERENCES audio_file
(id)
);

-- CREATE VIRTUAL TABLE audioEmbeddings USING vss0(
--     windowId TEXT NOT NULL,
--     vector(384),
--     FOREIGN KEY(windowId) REFERENCES audioWindows(id)
-- );

-- CREATE TABLE audioLabels (
--     id INTEGER PRIMARY KEY,
--     windowId TEXT NOT NULL,
--     label TEXT NOT NULL,
--     model TEXT NOT NULL,
--     probability REAL,
--     class TEXT,
--     FOREIGN KEY(windowId) REFERENCES audioWindows(id)
-- );

-- CREATE VIRTUAL TABLE audioLabelEmbeddings USING vss0(
--     labelId INTEGER NOT NULL,
--     vector(384),
--     FOREIGN KEY(labelId) REFERENCES audioLabels(id)
-- );

-- CREATE VIRTUAL TABLE audioMels USING vss0(
--     windowId TEXT NOT NULL,
--     vector(384),
--     FOREIGN KEY(windowId) REFERENCES audioWindows(id)
-- );