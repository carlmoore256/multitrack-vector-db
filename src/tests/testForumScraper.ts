import { saveJSON, loadJSON } from "../utils.js";
import { CambridgeMTForumScraper } from "../Forum.js";
import { CambridgeMTRecording } from "../Recording.js";
import { crawlForumPostingsForURL } from "../Forum.js";
import { getForumId } from "../forumParsers.js";

async function test() {

    const recordings = loadJSON<any[]>("./data/recordings.json");
    // const url = recordings[10].forumUrl as string;

    const deadRoses = recordings.find(r => r.name == "Dead Roses");
    if (!deadRoses) {
        throw new Error("Could not find recording");
    }
    const url = deadRoses.forumUrl as string;

    // const forumScraper = new CambridgeMTForumScraper(url);
    // await forumScraper.load();
    
    const allForumThreads = await crawlForumPostingsForURL(url);
    saveJSON(allForumThreads, `./data/forum-threads-${getForumId(url)}.json`);

}

export default test;