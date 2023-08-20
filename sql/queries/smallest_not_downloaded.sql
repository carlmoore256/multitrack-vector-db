SELECT
    multitrack_recording.id as id,
    multitrack_recording_download.url as url,
    multitrack_recording_download.filename as filename,
    multitrack_recording_download.type as type,
    num_tracks,
    multitrack_recording.name as name,
    multitrack_recording_download.bytes as bytes,
    multitrack_recording_download.bytes / 1048576.0 as total_megabytes
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
AND
    multitrack_recording_download.type = 'multitrack'
ORDER BY
    multitrack_recording_download.bytes ASC