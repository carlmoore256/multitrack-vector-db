SELECT 
    multitrack_recording.id as id,
    multitrack_recording.name as name,
    recording_file.file_id as file_id
FROM
    multitrack_recording
INNER JOIN
    recording_file
ON
    recording_file.recording_id = multitrack_recording.id
WHERE
    id = '6ce586e0-206b-46e2-8c9c-d0560528e4dc';