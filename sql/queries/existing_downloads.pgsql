SELECT
    *
FROM
    multitrack_recording
LEFT JOIN
    multitrack_recording_download
ON
    multitrack_recording.id = multitrack_recording_download.recording_id
LEFT JOIN
    multitrack_recording_file
ON
    multitrack_recording_file.recording_id = multitrack_recording.id
WHERE
    multitrack_recording_file.file_id IS NOT NULL
LIMIT 10