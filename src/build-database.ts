import { CambridgeMTScraper } from "./Scraper.js";
import { IForumThread } from "./models/forum-models.js";
import { DatabaseClient } from "./database/DatabaseClient.js";
import { Debug, LogColor } from "./utils/Debug.js";
import { crawlForumPostingsForRecording, insertAllForumsIntoDatabase, crawlForumPostingsForURL } from "./Forum.js";
import { CambridgeMTForumThreadScraper, crawlForumThreads } from "./ForumThread.js";
import { getCambridgeForumListingURL } from "./forumParsers.js";
import { yesNoPrompt, selectPrompt } from "./cli/cli-promts.js";
import { saveJSON } from "./utils/utils.js";
import { CambridgeMTRecording } from "./Recording.js";
import ProgressBar, { ProgressBarOptions} from "progress";
// import logUpdate from "log-update";
import { debugPBar } from "./cli/progress-bar.js";

const dbClient = new DatabaseClient();
await dbClient.connect();
Debug.log("Connected to database", LogColor.Green);

export async function parseAllMultitracks() : Promise<CambridgeMTRecording[]> {
    const timeStart = Date.now();
    const scraper = new CambridgeMTScraper();
    await scraper.load();
    await scraper.parseRecordings();
    Debug.log("Scraping complete");
    const { genres, artists, recordings } = scraper;


    Debug.log("Inserting genres");
    for (const genre of genres) {
        try {
            const res = await genre.insertIntoDatabase(dbClient);
        } catch (e) {
            Debug.logError(e);
        }
    }
    
    Debug.log("Inserting artists");
    for (const artist of artists) {
        try {
            await artist.insertIntoDatabase(dbClient);
        } catch (e) {
            Debug.logError(e);
        }
    }

    Debug.log("Inserting recordings");
    for (const recording of recordings) {
        try {
            await recording.insertIntoDatabase(dbClient);
        } catch (e) {
            Debug.logError(e);
        }
    }

    const timeEnd = Date.now();
    const timeElapsed = (timeEnd - timeStart) / 1000;
    Debug.log(`[Complete] Parsed all multitracks in ${timeElapsed} seconds`, LogColor.Green);

    return recordings;
}

// must return the forum_url and id
export const DEFAULT_QUERY_FORUM_THREADS = `SELECT id, name, forum_url FROM multitrack_recording`

// tighten the query to get specific forum threads
export async function parseAllForumThreads(query : string = DEFAULT_QUERY_FORUM_POSTS) {
    
    Debug.enableLogging = false;

    const timeStart = Date.now();
    const recordings = await dbClient.query(query) as any[];

    Debug.log("Inserting forum threads");
    
    const pbar = debugPBar(recordings.length);

    for (const recording of recordings) {
        try {
            const allForumThreads = await crawlForumPostingsForURL(recording.forum_url, recording);
            const res = await insertAllForumsIntoDatabase(dbClient, allForumThreads);
            const exists = res.filter((r : string) => r === "exists").length;
            const inserted = res.filter((r : string) => r === "inserted").length;
            const failed = res.filter((r : string) => r === "failed").length;
            Debug.log(`[FORUMS] : ${inserted} inserted | ${exists} exist | ${failed} failed`, LogColor.Green);
            pbar.update();

        } catch (e) {
            Debug.logError(e);
        }
    }

    const timeEnd = Date.now();
    const timeElapsed = (timeEnd - timeStart) / 1000;
    Debug.log(`[Complete] Initialized database in ${timeElapsed} seconds`, LogColor.Green);

    Debug.enableLogging = true;
}

export const DEFAULT_QUERY_FORUM_POSTS = `
SELECT * FROM forum_thread WHERE forum_thread.replies > 10 ORDER BY forum_thread.views DESC LIMIT 10`


// parse all the forum posts according to a query
// this is expensive on network and storage, so query interesting ones
export async function parseAllForumPosts(query : string = DEFAULT_QUERY_FORUM_POSTS) {

    const threads = await dbClient.query(query) as IForumThread[];
    Debug.log(`Query returned ${threads.length} threads, starting crawl...`);

    const timeStart = Date.now();
    const pbar = debugPBar(threads.length);

    for(const thread of threads) {
        Debug.log(`Crawling thread ${thread.id} - ${thread.title} - ${thread.views} views | ${thread.url}`)
        const scraper = new CambridgeMTForumThreadScraper(thread.url, 0, thread);

        await scraper.load();

        const { posts, users, attachments } = await crawlForumThreads(scraper);

        Debug.log(`Found ${posts.length} posts | ${users.length} users | ${attachments.length} attachments`);

        Debug.log(`Inserting ${users.length} users into forum_user...`, LogColor.Green);        
        await dbClient.upsertMany('forum_user', users);
        
        Debug.log(`Inserting ${users.length} Forum Posts into forum_post...`, LogColor.Yellow);
        await dbClient.upsertMany('forum_post', posts);

        Debug.log(`Inserting ${attachments.length} attachments into multitrack_recording_download...`, LogColor.Blue);
        await dbClient.upsertMany('multitrack_recording_download', attachments);

        pbar.update();
    }
    
    console.log(`Done in ${(Date.now() - timeStart) / 1000} seconds`);
}