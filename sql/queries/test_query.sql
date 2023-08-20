SELECT
    multitrack_recording_download.id as id, 
    type,
    filename, 
    url, 
    bytes
FROM
    multitrack_recording_download
WHERE
    recording_id = ?
LEFT JOIN
    multitrack_recording_file
ON
    multitrack_recording_download.recording_id = multitrack_recording_file.recording_id
LEFT JOIN
    datastore_file
ON
    multitrack_recording_file.file_id = datastore_file.id