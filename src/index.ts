import { CambridgeMTScraper } from "./Scraper.js";
import { saveJSON, loadJSON } from "./utils.js";
import { CambridgeMTForumScraper } from "./Forum.js";
import { DatabaseClient } from "./database/dbClient.js";
import "reflect-metadata";

async function main() {
    const scraper = new CambridgeMTScraper();
    await scraper.load();
    await scraper.parseRecordings();
    console.log("Scraping complete");
    const { genres, artists, recordings } = scraper;
    saveJSON(genres, "./data/genres.json");
    saveJSON(artists, "./data/artists.json");
    saveJSON(recordings, "./data/recordings.json");
}


main();
