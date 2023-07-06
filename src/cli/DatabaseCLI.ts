import { yesNoPrompt, selectPrompt, inputPrompt, queryInputPrompt, queryBuilderPrompt } from "./cli-promts.js";
import { CambridgeMTParser, DEFAULT_QUERY_FORUM_THREADS } from "../parsing/CambridgeMTParser.js";
import { CambridgeMTDownloader } from "../downloading/CambridgeMTDownloader.js";
import { MultitrackDatastore } from "../datastore/MultitrackDatastore.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { Debug } from "../utils/Debug.js";
import { DownloadStatusUI } from "./DownloadStatusUI.js";
import { DownloadManager } from "../downloading/DownloadManager.js";

export class DatabaseCLI {

    private parser : CambridgeMTParser;
    // private downloader : CambridgeMTDownloader;
    
    constructor(private dbClient : DatabaseClient) {
        this.parser = new CambridgeMTParser(this.dbClient);
        // this.downloader = new CambridgeMTDownloader(this.dbClient);
    }
    async main() {
        
        if (!this.dbClient.isConnected) {
            await this.dbClient.connect();
        }
        
        const datastore = new MultitrackDatastore(this.dbClient);
        const isValid = await datastore.validate();
        // if (!isValid) {
        //     Debug.log("Database is not valid, quitting...");
        //     return;
        // }    
        
        while (true) {
            const choice = await selectPrompt<string>([
                {value : 'quit', name : "[Quit]"},
                {value : 'resetDialog', name : "Reset/Clear Tables..."},
                {value : 'query', name : "Query Database..."},
                {value : 'browse', name : 'Browse Database...'},
                {value : 'parseMultitracks', name: "1. Run Multitrack Parser & Insert into Database"},
                {value : 'parseAllForumThreads', name : "2. Parse all forum threads (top level)"},
                {value : 'parseAllForumPosts', name : "3. Parse a queried subset of forum posts and users (contains posts, replies, user accounts & user mixes)"},
                {value : 'downloadMultitracks', name : "4. Download multitracks with a given query"},
                {value : 'downloadAllMultitracks', name : "5. Download all multitracks with a given query"},
            ], "Select an option");
            
            let query;
    
            switch(choice) {
                case 'quit':
                    process.exit(0);
                case 'resetDialog':
                    await this.dbClient.initializeDatabaseDialog();
                    break;
                case 'query':
                    await this.dbClient.queryDialog();
                    break;
                case 'browse':
                    await this.dbClient.databaseBrowserDialog();
                    break;
                case 'parseMultitracks':
                    await this.parser.parseAllMultitracks();
                    break;
                case 'parseAllForumThreads':
                    query = await queryInputPrompt("Enter a search query", DEFAULT_QUERY_FORUM_THREADS);
                    await this.parser.parseAllForumThreads(query);
                    break;
                case 'parseAllForumPosts':
                    query = await queryBuilderPrompt(
                        'Choose a value to replace or finish:', 
                        'SELECT * FROM forum_thread WHERE forum_thread.replies > $1 ORDER BY $2 DESC LIMIT $3', 
                        { replies: '10', orderBy: "forum_thread.views", limit: '10' }
                    );
                    Debug.log("HERE IS THE QUERY: " + query);
                    await this.parser.parseAllForumPosts(query);
                    break;
                case 'downloadMultitracks':
                    await new CambridgeMTDownloader(this.dbClient, datastore).downloadFromQuery(`
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
                        LIMIT 1`, "multitrack");
                    break;
                case 'downloadAllMultitracks':
                    new DownloadStatusUI(DownloadManager.Instance);
                    await new CambridgeMTDownloader(this.dbClient, datastore).downloadAllMultitracks(10);
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
}