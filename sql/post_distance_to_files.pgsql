SELECT
    forum_post.username,
    forum_post.content,
    multitrack_recording.name as recording_name,
    forum_post.id as post_id,
    forum_post.vector <-> (SELECT vector FROM forum_post WHERE id = '48037') as distance,
    datastore_file.name as filename

    -- think about how we can query specific files based on distance from post embeddings
    -- for instance, a post talking about toms, is related to the multitrack_recording, 
    -- and we can join that recording with recording_files, then join with instruments,
    -- which then has embeddings on names. We can then get distances from those names,
    -- from which we are able to guess whatever file they are talking about that is most relevant
FROM
    forum_post
INNER JOIN
    forum_thread
ON
    forum_thread.id = forum_post.thread_id
INNER JOIN
    multitrack_recording
ON
    multitrack_recording.id = forum_thread.recording_id
LEFT JOIN
    recording_file
ON
    recording_file.recording_id = multitrack_recording.id
LEFT JOIN
    datastore_file
ON
    datastore_file.id = recording_file.file_id
WHERE
    vector IS NOT NULL
ORDER BY
    vector <-> (SELECT vector FROM forum_post WHERE id = '48037')
LIMIT 100;