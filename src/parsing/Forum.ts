import { getCambridgeForumListingURL, getForumId, parseThread } from "./forum-parsers.js";
import { CachedWebPage } from "../downloading/CachedWebPage.js";
import { IForumThread } from "../models/forum-models.js";
import { CambridgeMTRecording } from "./MultitrackRecording.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import Debug, { LogColor } from "../utils/Debug.js";


export class CambridgeMTForumScraper extends CachedWebPage {

    public forumId : number;

    constructor(public pageURLBase : string, public pageNumber : number = 1, public recording : CambridgeMTRecording) {
        const fullPageURL = pageURLBase + "&page=" + pageNumber;
        super(`cambridge-forum-${getForumId(pageURLBase)}`, fullPageURL);
        this.forumId = getForumId(pageURLBase);
    }

    static fromId(id : number, page : number = 1, recording : CambridgeMTRecording) : CambridgeMTForumScraper {
        const pageURL = getCambridgeForumListingURL(id);
        return new CambridgeMTForumScraper(pageURL, page, recording);
    }

    public getStickyThread() : any | null {        
        const element = this.page.querySelector("#content table") as HTMLElement;
        const stickiedElements = element.querySelectorAll("tr.inline_row"); // Select all stickied rows
        stickiedElements.forEach((row) => {
        const tdElement = row.querySelector("td.trow1.forumdisplay_sticky"); // Select the desired td element within each row
        if (tdElement) {
            Debug.log(tdElement.textContent as string); // Example: Output the text content of the td element
        }
        });
    }

    public getThreads() : IForumThread[] {
        const elements = this.page.querySelectorAll("tr.inline_row");
        const threads : any[] = [];
        elements.forEach((element) => {
            const thread = parseThread(element as HTMLElement, this.recording);
            if (thread) threads.push(thread);
        });
        return threads;
    }

    public getMaxPages(): number | null {
        const pagesSpan = this.page.querySelector(".pages");
        if (pagesSpan) {
            const pagesText = pagesSpan.textContent || '';
            const match = pagesText.match(/\((\d+)\)/); // Match the number inside parentheses
            if (match) {
                return Number(match[1]); // Return the matched number
            }
        }
        return null;
    }

    // gets the next page in the forum
    public async getNextPage() : Promise<CambridgeMTForumScraper | null> {
        const maxPages = this.getMaxPages();
        if (maxPages && this.pageNumber < maxPages) {
            // console.log("\n\Getting page", this.pageNumber + 1, "of", maxPages);
            const nextPageScraper = new CambridgeMTForumScraper(this.pageURLBase, this.pageNumber + 1, this.recording);
            await nextPageScraper.load();
            return nextPageScraper;
        }
        return null;
    }
    
}

// get all the threads for a forum page
export async function crawlForumPostingsForId(id : number, recording : CambridgeMTRecording) : Promise<IForumThread[]> {
    const allThreads : IForumThread[] = [];
    var scraper = CambridgeMTForumScraper.fromId(id, 1, recording);
    await scraper.load();
    while (scraper) {
        const threads = scraper.getThreads();
        allThreads.push(...threads);
        const nextScraper = await scraper.getNextPage();
        if (!nextScraper) {
            break;
        } else {
            scraper = nextScraper;
        }
    }
    const uniqueIds = new Set(allThreads.map((thread) => thread.id));
    const uniqueThreads = Array.from(uniqueIds).map((id) => allThreads.find((thread) => thread.id === id) as IForumThread);
    return uniqueThreads;
}

export async function crawlForumPostingsForURL(url : string, recording : CambridgeMTRecording) : Promise<IForumThread[]> {
    const id = getForumId(url);
    return crawlForumPostingsForId(id, recording);
}

export async function crawlForumPostingsForRecording(recording : CambridgeMTRecording) : Promise<IForumThread[]> {
    if (!recording.forumUrl) {
        throw new Error("No forum URL found for recording");
    }
    return await crawlForumPostingsForURL(recording.forumUrl, recording);
}

export async function crawlForumPostingsForRecordingsToDb(recording : CambridgeMTRecording, db : DatabaseClient) {
    const postings = await crawlForumPostingsForRecording(recording);
    postings.forEach(posting => insertForumIntoDatabase(db, posting));
}


export function insertForumIntoDatabase(db : DatabaseClient, forum : IForumThread) : Promise<any> {
    
    return new Promise(async (resolve, reject) => {
        try {
            const existing = await db.getById("forum_thread", forum.id.toString());
            
            if (existing) {
                resolve("exists");
                return;
            }

            var rating = forum.rating;
            if (!rating) {
                rating = 0;
            } else {
                rating = Math.round(rating);  // annoyingly had half-stars
            }

            const success = await db.insert("forum_thread", {
                id: forum.id,
                url: forum.url || null,
                title: forum.title || null,
                author: forum.author || null,
                author_id : forum.author_id || null,
                replies: forum.replies || 0,
                views: forum.views || 0,
                rating: rating,
                last_post_date: forum.last_post_date || null,
                has_attachment: forum.has_attachment || false,
                recording_id: forum.recording_id
            });
            if (success) {
                resolve("inserted");
            } else {
                reject("failed");
            }
        } catch (e : any) {
            Debug.log(e, LogColor.White, 'ERROR', true);
            reject(e);
        }
    });
}

export async function insertAllForumsIntoDatabase(db : DatabaseClient, forums : IForumThread[]) : Promise<any> {
    return Promise.all(forums.map((forum) => insertForumIntoDatabase(db, forum)));
}

// export class CambridgeMTForumThreadScraper extends CachedWebPage {
    
// }



// // each span with class subject_new, with id that starts with tid_
// // has an anchor tag that leads to a post
// class CambridgeMTForumPost {
//     public stars : number;
// }