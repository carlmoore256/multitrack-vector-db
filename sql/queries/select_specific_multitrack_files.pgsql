WITH avg_vector AS (
    SELECT 
        AVG(vector) AS average_vector
    FROM 
        forum_post
    WHERE 
        date::timestamp >= NOW() - INTERVAL '1 year'
)

SELECT
    p.id, 
    p.thread_id, 
    p.author_id, 
    p.username, 
    p.date, 
    p.content, 
    p.attachment_id,
    p.vector <-> av.average_vector AS distance_to_avg
FROM 
    forum_post p, 
    avg_vector av
WHERE 
    p.date::timestamp >= NOW() - INTERVAL '1 year'
ORDER BY 
    p.vector <-> av.average_vector
LIMIT 10;
