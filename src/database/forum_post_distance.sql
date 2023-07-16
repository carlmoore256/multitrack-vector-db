SELECT
    forum_post.username,
    forum_post.content,
    multitrack_recording.name as recording_name,
    forum_post.id as post_id,
    forum_post.vector <-> (SELECT vector FROM forum_post WHERE id = '55895') as distance
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
WHERE
    vector IS NOT NULL
ORDER BY
    vector <-> (SELECT vector FROM forum_post WHERE id = '55895')
LIMIT 100;