SELECT
    multitrack_recording.id as id,
    multitrack_recording_download.url as url,
    multitrack_recording_download.filename as filename,
    multitrack_recording_download.type as type,
    num_tracks,
    multitrack_recording.name as name,
    multitrack_recording_download.bytes as bytes
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
    multitrack_recording_file.file_id IS NULL
ORDER BY
    multitrack_recording_download.bytes ASC,
    name ASC
    
LIMIT 10