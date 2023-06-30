import { DatabaseClient } from "./database/DatabaseClient.js";
import { Debug } from "./utils/Debug.js";
import { yesNoPrompt, selectPrompt, inputPrompt, queryInputPrompt, queryBuilderPrompt } from "./cli/cli-promts.js";
import { parseAllMultitracks, parseAllForumThreads, parseAllForumPosts, DEFAULT_QUERY_FORUM_POSTS, DEFAULT_QUERY_FORUM_THREADS } from "./build-database.js";
import { downloadMultitrackFromDialog, generalQuery, downloadAllMultitracks } from "./downloading/download-querying.js";

const dbClient = new DatabaseClient();
await dbClient.connect();
Debug.log("Connected to database");

async function main() {

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
                await dbClient.initializeDatabaseDialog();
                break;
            case 'query':
                await dbClient.queryDialog();
                break;
            case 'browse':
                await dbClient.databaseBrowserDialog();
                break;
            case 'parseMultitracks':
                await parseAllMultitracks();
                break;
            case 'parseAllForumThreads':
                query = await queryInputPrompt("Enter a search query", DEFAULT_QUERY_FORUM_THREADS);
                await parseAllForumThreads(query);
                break;
            case 'parseAllForumPosts':
                query = await queryBuilderPrompt(
                    'Choose a value to replace or finish:', 
                    'SELECT * FROM forum_thread WHERE forum_thread.replies > $1 ORDER BY $2 DESC LIMIT $3', 
                    { replies: '10', orderBy: "forum_thread.views", limit: '10' }
                );
                Debug.log("HERE IS THE QUERY: " + query);
                await parseAllForumPosts(query);
                break;
            case 'downloadMultitracks':
                await downloadMultitrackFromDialog(dbClient, "all");
                break;
            case 'downloadAllMultitracks':
                await downloadAllMultitracks(dbClient, 10);
                break;
            default:
                console.log("Invalid choice");
                break;
        }
        
    }
}
// copyFileSync(f1, f2);
main();
