SELECT 
    * 
FROM
    multitrack_recording
LEFT JOIN
    multitrack_recording_download
ON
    multitrack_recording_download.recording_id = multitrack_recording.id
LEFT JOIN
    recording_file
ON
    recording_file.recording_id = multitrack_recording.id
LEFT JOIN
    datastore_file
ON
    datastore_file.id = recording_file.file_id
LIMIT 10;