import { IForumPost } from "../models/forum-models.js";
import { DatabaseClient } from "./DatabaseClient.js";
import { OpenAIClient } from "../services/OpenAIClient.js";
import { CreateEmbeddingResponseDataInner } from "openai";
import Debug from "../utils/debug.js";
import { time } from "console";
import ProgressBar, { ProgressBarOptions } from 'progress';

const OPENAI_CLIENT = new OpenAIClient();

export async function vectorizeForumPost(post: IForumPost, client: DatabaseClient): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        try {
            if (post.content === null) throw new Error('Cannot vectorize null content');
            const response = await OPENAI_CLIENT.embeddings(post.content);
            const vector = response.data[0].embedding;
            await client.query('UPDATE forum_post SET vector = $1 WHERE id = $2', [JSON.stringify(vector), post.id]);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

async function percentVectorized(client: DatabaseClient) {
    const res = await client.runQueryRowsFromFile('percent_vectorized.sql');
    if (!res) throw new Error('Could not get percent vectorized');
    return res[0].percent;
}

async function vectorizeBatch(limit = 100, client: DatabaseClient) {
    const posts = await client.queryRows(`SELECT * FROM forum_post WHERE vector IS NULL AND content IS NOT NULL LIMIT $1`, [limit]);
    if (!posts) throw new Error('Could not get posts from database');
    if (posts.length > limit) throw new Error('More posts than limit'); // will never happen remove me (just being cautious)
    const promises = posts.map(post => vectorizeForumPost(post, client));
    await Promise.all(promises);
}


export async function vectorizeAll(
        client: DatabaseClient,
        batchSize: number = 1000, 
        delay: number = 1000 * 60,
        maxRetries: number = 5) {
    
    // let vectorizedPercent = await percentVectorized(client);

    const bar = new ProgressBar('Vectorizing [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        total: 100
    });

    let retries = 0;

    Debug.log('Running vectorize batch...');
    const runBatch = async() => {
        try {
            await vectorizeBatch(batchSize, client);
        } catch (error) {
            Debug.error(error);
            retries++;
            if (retries > maxRetries) {
                Debug.error('Max retries exceeded');
                process.exit(1);
            }
        }
        const vectorizedPercent = await percentVectorized(client);
        bar.update(vectorizedPercent / 100);
        if (vectorizedPercent < 99.9) {
            setTimeout(runBatch, delay);
        }
    }

    await runBatch();
}
// rate limit is 3000 per minute

// const client = new DatabaseClient();
// await client.connect();
// vectorizeAll(1000, (1000 * 60) / 3);