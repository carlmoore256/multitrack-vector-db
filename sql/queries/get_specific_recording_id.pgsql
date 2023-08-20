SELECT
    multitrack_recording_download.id AS id, 
    multitrack_recording_download.type,
    filename, 
    url, 
    multitrack_recording_download.bytes
FROM
    multitrack_recording_download
LEFT JOIN
    multitrack_recording_file
ON
    multitrack_recording_download.recording_id = multitrack_recording_file.recording_id
LEFT JOIN
    datastore_file
ON
    recording_file.file_id = datastore_file.id
WHERE
    multitrack_recording_download.recording_id = '7398da0c-a92b-4f0e-af9b-a2add8c1d902'
    AND datastore_file.id IS NULL;  