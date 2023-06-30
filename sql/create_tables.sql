CREATE TABLE IF NOT EXISTS genre (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sub_genres TEXT
);

-- IDatabaseWriteable
CREATE TABLE IF NOT EXISTS artist (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);


CREATE TABLE IF NOT EXISTS artist_resource (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    uri TEXT NOT NULL,
    FOREIGN KEY(artist_id) REFERENCES artist(id)
);

-- IDatabaseWriteable
-- represents an entire recording session with many multitrack_files
CREATE TABLE IF NOT EXISTS multitrack_recording (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    num_tracks INTEGER NOT NULL,
    artist_id TEXT NOT NULL,
    metadata TEXT,
    forum_url TEXT,
    FOREIGN KEY(artist_id) REFERENCES artist(id)
);

CREATE TABLE IF NOT EXISTS multitrack_recording_download (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    bytes BIGINT,
    recording_id TEXT NOT NULL,
    FOREIGN KEY(recording_id) REFERENCES multitrack_recording
);

-- junction table to form a many-to-many relationship between genre and artist
-- because artist may have many genres, and genres aren't associated directly
-- with artists
CREATE TABLE IF NOT EXISTS artist_genre (
    artist_id TEXT NOT NULL,
    genre_id TEXT NOT NULL,
    FOREIGN KEY(artist_id) REFERENCES artist(id),
    FOREIGN KEY(genre_id) REFERENCES genre(id)
);

-- represents a single file associated with a multitrack_recording
CREATE TABLE IF NOT EXISTS audio_file (
    id TEXT PRIMARY KEY,
    uri TEXT NOT NULL,
    name TEXT NOT NULL,
    tags TEXT,
    bytes BIGINT,
    metadata TEXT
    -- recording_id TEXT NOT NULL,
    -- FOREIGN KEY(recording_id) REFERENCES multitrack_recording(id)
);


-- a junction table for a genre assigned to a recording, because it's a many-to-many
-- relationship, since each recording can have multiple genres
CREATE TABLE IF NOT EXISTS recording_genre (
    recording_id TEXT NOT NULL,
    genre_id TEXT NOT NULL,
    PRIMARY KEY(recording_id, genre_id),
    FOREIGN KEY(recording_id) REFERENCES multitrack_recording(id),
    FOREIGN KEY(genre_id) REFERENCES genre(id)
);

-- a junction table connecting an audio file to a recording
CREATE TABLE IF NOT EXISTS recording_file (
    recording_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    FOREIGN KEY(recording_id) REFERENCES multitrack_recording
(id),
    FOREIGN KEY(file_id) REFERENCES audio_file(id)
);

CREATE TABLE IF NOT EXISTS forum_user (
    id TEXT PRIMARY KEY,
    username TEXT,
    joined_date TEXT,
    posts_count INTEGER,
    threads_count INTEGER,
    profile_url TEXT
);

CREATE TABLE IF NOT EXISTS forum_thread (
    id TEXT PRIMARY KEY,
    url TEXT,
    title TEXT,
    author TEXT,
    author_id TEXT,
    replies INTEGER,
    views INTEGER,
    rating INTEGER,
    last_post_date TEXT,
    recording_id TEXT,
    has_attachment BOOLEAN,
    FOREIGN KEY(recording_id) REFERENCES multitrack_recording(id)
);

CREATE TABLE IF NOT EXISTS forum_post (
    id INTEGER PRIMARY KEY,
    thread_id TEXT,
    author_id TEXT,
    username TEXT, -- just have both for ease of use when querying chats
    date TEXT,
    content TEXT,
    attachment_id TEXT,
    FOREIGN KEY(thread_id) REFERENCES forum_thread(id),
    FOREIGN KEY(author_id) REFERENCES forum_user(id)
);

CREATE TABLE IF NOT EXISTS audio_window (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    sample_start INTEGER NOT NULL,
    sample_end INTEGER NOT NULL,
    sample_length INTEGER NOT NULL,
    time_start REAL NOT NULL,
    time_end REAL NOT NULL,
    time_length REAL NOT NULL,
    normalized_time_start REAL NOT NULL,
    normalized_time_end REAL NOT NULL,
    normalized_time_length REAL NOT NULL,
    clip_index INTEGER,
    FOREIGN KEY(file_id) REFERENCES audio_file
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