SELECT 
    forum_thread.*,
    forum_thread.id as thread_id,
    COUNT(*) as count
FROM 
    forum_thread
INNER JOIN
    multitrack_recording
ON
    forum_thread.recording_id = multitrack_recording.id
RIGHT JOIN
    recording_file
ON
    multitrack_recording.id = recording_file.recording_id
GROUP BY
    thread_id
HAVING
    COUNT(*) > 1
LIMIT 100;
