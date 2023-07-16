WITH unvectorized AS (
    SELECT 
        COUNT(*) AS total
    FROM
        forum_post
    WHERE
        vector IS NULL
),
vectorized AS (
    SELECT 
        COUNT(*) AS total
    FROM
        forum_post
    WHERE
        vector IS NOT NULL
)
SELECT
    (vectorized.total * 100.0 / (vectorized.total + unvectorized.total)) as percent
FROM
    vectorized, unvectorized
