import {
    yesNoPrompt,
    selectPrompt,
    inputPrompt,
    queryInputPrompt,
    queryBuilderPrompt,
} from "./cli-promts.js";
import { MultitrackDownloadType } from "@prisma/client";
import {
    CambridgeMTParser,
    DEFAULT_QUERY_FORUM_THREADS,
} from "../parsing/CambridgeMTParser.js";
import { CambridgeMTDownloader } from "../downloading/CambridgeMTDownloader.js";
import { MultitrackDatastore } from "../datastore/MultitrackDatastore.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { Debug } from "../utils/Debug.js";
import { DownloadStatusUI } from "./DownloadStatusUI.js";
import { DownloadManager } from "../downloading/DownloadManager.js";
import { vectorizeAll } from "../database/vectorize.js";
import dotenv from "dotenv";
dotenv.config();

export class DatabaseCLI {
    private parser: CambridgeMTParser;
    // private downloader : CambridgeMTDownloader;

    constructor(private dbClient: DatabaseClient) {
        this.parser = new CambridgeMTParser(this.dbClient);
        // this.downloader = new CambridgeMTDownloader(this.dbClient);
    }
    async main() {
        if (!this.dbClient.isConnected) {
            await this.dbClient.connect();
        }

        const datastore = new MultitrackDatastore(this.dbClient);
        
        if (process.env.VALIDATE_DATASTORE === "true") {
            const isValid = await datastore.validate();
        }
        // if (!isValid) {
        //     Debug.log("Database is not valid, quitting...");
        //     return;
        // }

        while (true) {
            const choice = await selectPrompt<string>(
                [
                    { value: "quit", name: "[Quit]" },
                    { value: "resetDialog", name: "Reset/Clear Tables..." },
                    { value: "query", name: "Query Database..." },
                    { value: "browse", name: "Browse Database..." },
                    {
                        value: "parseMultitracks",
                        name: "1. Run Multitrack Parser & Insert into Database",
                    },
                    {
                        value: "parseAllForumThreads",
                        name: "2. Parse all forum threads (top level)",
                    },
                    {
                        value: "parseAllForumPosts",
                        name: "3. Download + parse a queried subset of forum posts and users (contains posts, replies, user accounts & user mixes)",
                    },
                    {
                        value: "parseCachedForumPosts",
                        name: "3.1 Parse cached forum posts",
                    },
                    {
                        value: "downloadMultitracks",
                        name: "4. Download multitracks with a given query",
                    },
                    {
                        value: "downloadAllMultitracks",
                        name: "5. Download all multitracks with a given query",
                    },
                    {
                        value: "parseDownloadedForumPosts",
                        name: "6. Download and parse any forum posts related to existing multitracks in the datastore",
                    },
                    {
                        value: "vectorizeForumPosts",
                        name: "7. Vectorize all forum posts",
                    },
                ],
                "Select an option"
            );

            let query;

            switch (choice) {
                case "quit":
                    process.exit(0);
                case "resetDialog":
                    await this.dbClient.initializeDatabaseDialog();
                    break;
                case "query":
                    await this.dbClient.queryDialog();
                    break;
                case "browse":
                    await this.dbClient.databaseBrowserDialog();
                    break;
                case "parseMultitracks":
                    await this.parser.parseAllMultitracks();
                    break;
                case "parseAllForumThreads":
                    query = await queryInputPrompt(
                        "Enter a search query",
                        DEFAULT_QUERY_FORUM_THREADS
                    );
                    await this.parser.parseAllForumThreads(query);
                    break;
                case "parseAllForumPosts":
                    query = await queryBuilderPrompt(
                        "Choose a value to replace or finish:",
                        "SELECT * FROM forum_thread WHERE forum_thread.replies > $1 ORDER BY $2 DESC LIMIT $3",
                        {
                            replies: "10",
                            orderBy: "forum_thread.views",
                            limit: "10",
                        }
                    );
                    await this.parser.parseForumPostsFromQuery({
                        replies: { gt: 18 }
                    });
                    break;
                case "parseCachedForumPosts":
                    // await this.parser.parseAllCachedForumPosts();
                    console.log(`Not implemented`);
                    break;
                case "downloadMultitracks":
                    await new CambridgeMTDownloader(
                        this.dbClient,
                        datastore
                    ).downloadFromQuery(
                        `
                        SELECT 
                            multitrack_recording.id as id,
                            multitrack_recording.name as name,
                            multitrack_recording_download.url as url
                        FROM 
                            multitrack_recording 
                        INNER JOIN
                            multitrack_recording_download
                        ON
                            multitrack_recording.id = multitrack_recording_download.recording_id
                        ORDER BY
                            multitrack_recording_download.bytes ASC
                        LIMIT 1`,
                        MultitrackDownloadType.MULTITRACK
                    );
                    break;
                case "downloadAllMultitracks":
                    new DownloadStatusUI(DownloadManager.Instance);
                    await new CambridgeMTDownloader(
                        this.dbClient,
                        datastore
                    ).downloadAllMultitracks(100);
                    break;
                case "parseDownloadedForumPosts":
                    query = await queryBuilderPrompt(
                        "Choose a value to replace or finish:",
                        `SELECT DISTINCT ON (forum_thread.id)
                            forum_thread.*
                        FROM 
                            forum_thread
                        INNER JOIN
                        multitrack_recording_file
                        ON
                            forum_thread.recording_id = multitrack_recording_file.recording_id
                        LEFT JOIN
                            forum_post
                        ON
                            forum_thread.id = forum_post.thread_id
                        WHERE 
                            forum_post.id IS NULL`,
                        {
                            replies: "10",
                            orderBy: "forum_thread.views",
                            limit: "10",
                        }
                    );
                    // make sure this is actually getting the forum
                    // posts that have mt downloads for the user
                    await this.parser.parseForumPostsFromQuery({
                        replies: { gt: 1 }, views: { gt: 100 }
                    });
                    break;
                case "vectorizeForumPosts":
                    await vectorizeAll(this.dbClient, 1000, (1000 * 60) / 3);
                    break;
                default:
                    console.log("Invalid choice");
                    break;
            }
        }
    }
}

export default () => {
    const cli = new DatabaseCLI(new DatabaseClient());
    cli.main();
};
