import { CambridgeMTScraper } from "./Scraper.js";
import { IForumThread } from "../models/forum-models.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { Debug, LogColor } from "../utils/Debug.js";
import { crawlRecordingForumPosts } from "./Forum.js";
import {
    CambridgeMTForumThreadScraper,
    crawlForumThreads,
} from "./ForumThread.js";
import { getCambridgeForumListingURL } from "./forum-parsers.js";
import { yesNoPrompt, selectPrompt } from "../cli/cli-promts.js";
import { saveJSON } from "../utils/utils.js";
import { CambridgeMTRecording } from "./MultitrackRecording.js";
import ProgressBar, { ProgressBarOptions } from "progress";
// import logUpdate from "log-update";
import { debugPBar } from "../cli/progress-bar.js";
import { getAllFilesInDir } from "../utils/files.js";

import { Prisma, ForumThread, PrismaClient } from "@prisma/client";
import client from "../database/prisma.js";
import dotenv from "dotenv";
dotenv.config();

Debug.log("Connected to database", LogColor.Green);
export const DEFAULT_QUERY_FORUM_THREADS = `SELECT id, name, forum_url FROM multitrack_recording`;

export const DEFAULT_QUERY_FORUM_POSTS = `
SELECT * FROM forum_thread WHERE forum_thread.replies > 10 ORDER BY forum_thread.views DESC LIMIT 10`;

export class CambridgeMTParser {
    constructor(private dbClient: DatabaseClient) {}

    async parseAllMultitracks(): Promise<CambridgeMTRecording[]> {
        const timeStart = Date.now();

        const scraper = new CambridgeMTScraper();
        // const client = new PrismaClient();

        await scraper.load();
        await scraper.parseRecordings();

        Debug.log("Scraping complete");
        const { genres, artists, recordings } = scraper;

        Debug.log("Inserting genres");
        for (const genre of genres) {
            try {
                const res = await genre.insertIntoDatabase(client);
            } catch (e) {
                Debug.error(e);
            }
        }

        Debug.log("Inserting artists");
        for (const artist of artists) {
            try {
                await artist.insertIntoDatabase(client);
            } catch (e) {
                Debug.error(e);
            }
        }

        Debug.log("Inserting recordings");
        for (const recording of recordings) {
            try {
                await recording.insertIntoDatabase(client);
            } catch (e) {
                Debug.error(e);
            }
        }

        const timeEnd = Date.now();
        const timeElapsed = (timeEnd - timeStart) / 1000;
        Debug.log(
            `[Complete] Parsed all multitracks in ${timeElapsed} seconds`,
            LogColor.Green
        );

        return recordings;
    }

    // must return the forum_url and id

    // tighten the query to get specific forum threads
    async parseAllForumThreads(query: string = DEFAULT_QUERY_FORUM_POSTS) {
        Debug.enableLogging = false;

        const timeStart = Date.now();

        // const client = new PrismaClient();
        // const recordings = await this.dbClient.queryRows(query) as any[];
        const recordings = await client.multitrackRecording.findMany();

        Debug.log("Inserting forum threads");

        const pbar = debugPBar(recordings.length);

        // while (numParsed < recordings.length) {
        const batchSize = 10; // Change this to control how many promises are run in parallel
        const promiseChunks: any[][] = []; // Array to hold our "chunks" of promises

        // Create promise "chunks"
        for (let i = 0; i < recordings.length; i += batchSize) {
            promiseChunks.push(recordings.slice(i, i + batchSize));
        }

        for (const chunk of promiseChunks) {
            const promises = chunk.map(async (recording) => {
                try {
                    const allForumThreads = await crawlRecordingForumPosts(
                        recording
                    );
                    const batch = await client.forumThread.createMany({
                        data: allForumThreads,
                        skipDuplicates: true,
                    });

                    Debug.log(
                        `[FORUMS] : ${batch.count} inserted | ${
                            allForumThreads.length - batch.count
                        } existing`,
                        LogColor.Green
                    );
                    pbar.update();
                } catch (e) {
                    Debug.error(e);
                }
            });

            // Wait for all promises in the current chunk to complete
            await Promise.all(promises);
        }

        const timeEnd = Date.now();
        const timeElapsed = (timeEnd - timeStart) / 1000;
        Debug.log(
            `[Complete] Initialized database in ${timeElapsed} seconds`,
            LogColor.Green
        );

        Debug.enableLogging = true;
    }

    async parsePostsFromThreads(threads: ForumThread[]) {
        // client = client || new PrismaClient();

        const timeStart = Date.now();
        const pbar = debugPBar(threads.length);

        for (const thread of threads) {
            Debug.log(
                `Crawling thread ${thread.id} - ${thread.title} - ${thread.views} views | ${thread.url}`
            );
            const scraper = new CambridgeMTForumThreadScraper(thread);
            await scraper.load();

            const { posts, users, downloads } = await crawlForumThreads(
                scraper
            );

            await client.forumUser.createMany({
                data: users,
                skipDuplicates: true,
            });

            await client.forumPost.createMany({
                data: posts,
                skipDuplicates: true,
            });

            await client.multitrackRecordingDownload.createMany({
                data: downloads,
                skipDuplicates: true,
            });

            Debug.log(
                `[INSERTED] ${posts.length} posts | ${users.length} users | ${downloads.length} attachments`,
                LogColor.Green
            );

            pbar.update();
        }

        console.log(`Done in ${(Date.now() - timeStart) / 1000} seconds`);
    }

    // parse all the forum posts according to a query
    // this is expensive on network and storage, so query interesting ones
    async parseForumPostsFromQuery(query: Prisma.ForumThreadWhereInput) {
        const threads = await client.forumThread.findMany({
            where: query,
        });
        Debug.log(
            `Query returned ${threads.length} threads, starting crawl...`
        );
        this.parsePostsFromThreads(threads);
    }

    // async parseAllCachedForumPosts() {
    //     let allCacheFiles = getAllFilesInDir(process.env.CACHE_DIR as string);
    //     allCacheFiles = allCacheFiles.map((f) =>
    //         f
    //             .replace(process.env.CACHE_DIR as string, "")
    //             .replace(".html", "")
    //             .replace("/", "")
    //     );
    //     const threadUrls = allCacheFiles.filter(
    //         (f) =>
    //             f.startsWith("discussion") && f.includes("showthread.php_tid")
    //     );
    //     const threadIds = threadUrls.map(
    //         (url) => url.split("tid_")[1].split("_")[0]
    //     );
    //     const uniqueThreadIds = new Set(threadIds);

    //     const pbar = debugPBar(uniqueThreadIds.size);

    //     const client = new PrismaClient();

    //     const threads = await client.forumThread.findMany({
    //         where: {
    //             id: { in: Array.from(uniqueThreadIds) },
    //         },
    //     });

    //     console.log(`Number existing in cache: ${threadIds.length}`);

    //     for (const thread of threads) {
    //         const scraper = new CambridgeMTForumThreadScraper(thread);
    //         await scraper.load();
    //         const { posts, users, downloads } = await crawlForumThreads(
    //             scraper
    //         );
    //         await client.forumUser.createMany({
    //             data: users,
    //             skipDuplicates: true,
    //         });

    //         await client.forumPost.createMany({
    //             data: posts,
    //             skipDuplicates: true,
    //         });

    //         await client.multitrackRecordingDownload.createMany({
    //             data: downloads,
    //             skipDuplicates: true,
    //         });
    //     }
    // }
}