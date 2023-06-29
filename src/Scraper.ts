import {JSDOM} from "jsdom";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { checkLoadCache } from "./utils/utils.js";
import { CambridgeMTRecording } from "./Recording.js";
import { CambridgeMTGenre, consolidateGenres } from "./Genre.js";
import { CambridgeMTArtist, consolidateArtists } from "./Artist.js";
import { CachedWebPage } from "./CachedWebPage.js";
import Debug from "./utils/Debug.js";

const BASE_URL = "https://www.cambridge-mt.com/ms/mtk/";
const CACHE_ID = "cambridge-mt";

/// todo 
/// - make scraper for forum pages
///     - integrate this with a vector database for querying with llm
/// - make downloader for mix full preview


export type CambridgeMTDatabaseTypes = {
    genres : CambridgeMTGenre[],
    artists : CambridgeMTArtist[],
    recordings : CambridgeMTRecording[],
}



export class CambridgeMTScraper extends CachedWebPage {

    private _recordings : CambridgeMTRecording[] | null = null;

    constructor(pageURL: string = BASE_URL) {
        super('cambridge-mt', pageURL)
    }

    get recordings() : CambridgeMTRecording[] {
        if (!this.page) {
            throw new Error("Page not loaded");
        }
        if (!this._recordings) {
            throw new Error("Recordings not parsed, call parseRecordings()");
        }
        return this._recordings;
    }

    get artists() : CambridgeMTArtist[] {
        return consolidateArtists(this.recordings.map(r => r.artist));
    }

    get genres() : CambridgeMTGenre[] {
        const allGenres = []
        for (const r of this.recordings) {
            for (const g of r.artist.genres) {
                allGenres.push(g);
            }
        }
        return consolidateGenres(allGenres);
    }

    async parseRecordings() : Promise<CambridgeMTRecording[]> {
        if (!this.page) {
            throw new Error("Page not loaded");
        }
        const recordingElements = this.page.querySelectorAll('.m-mtk-track');
        Debug.log(`Parsing ${recordingElements.length} recordings`);
        const recordings = Array.from(recordingElements).map(e => {
            return CambridgeMTRecording.fromElement(e as HTMLElement)
        });
        this._recordings = recordings;
        return recordings;
    }


    async scrape() : Promise<CambridgeMTDatabaseTypes> {
        await this.load();
        const recordings = this.recordings;
        const artists = this.artists;
        const genres = this.genres;
        return {
            genres,
            artists,
            recordings,
        }
    }
}
