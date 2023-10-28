import {
    getCambridgeForumListingURL,
    getForumId,
    parseThread,
} from "./forum-parsers.js";
import { CachedWebDocument } from "../downloading/CachedWebPage.js";
import { IForumThread } from "../models/forum-models.js";
import { CambridgeMTRecording } from "./MultitrackRecording.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import Debug, { LogColor } from "../utils/debug.js";

import { ForumThread, PrismaClient, MultitrackRecording } from "@prisma/client";

export class CambridgeMTForumScraper extends CachedWebDocument {
    public forumId: number;

    constructor(
        public pageURLBase: string,
        public pageNumber: number = 1,
        public recording: MultitrackRecording
    ) {
        const fullPageURL = pageURLBase + "&page=" + pageNumber;
        super(fullPageURL, "FORUM_LIST_PAGE");
        this.forumId = getForumId(pageURLBase);
    }

    static fromId(
        id: number,
        page: number = 1,
        recording: MultitrackRecording
    ): CambridgeMTForumScraper {
        const pageURL = getCambridgeForumListingURL(id);
        return new CambridgeMTForumScraper(pageURL, page, recording);
    }

    public getStickyThread(): any | null {
        const element = this.document.querySelector(
            "#content table"
        ) as HTMLElement;
        const stickiedElements = element.querySelectorAll("tr.inline_row"); // Select all stickied rows
        stickiedElements.forEach((row) => {
            const tdElement = row.querySelector("td.trow1.forumdisplay_sticky"); // Select the desired td element within each row
            if (tdElement) {
                Debug.log(tdElement.textContent as string); // Example: Output the text content of the td element
            }
        });
    }

    public getThreads(): ForumThread[] {
        const elements = this.document.querySelectorAll("tr.inline_row");
        const threads: ForumThread[] = [];
        elements.forEach((element) => {
            const thread = parseThread(element as HTMLElement, this.recording);
            if (thread) threads.push(thread);
        });
        return threads;
    }

    public getMaxPages(): number | null {
        const pagesSpan = this.document.querySelector(".pages");
        if (pagesSpan) {
            const pagesText = pagesSpan.textContent || "";
            const match = pagesText.match(/\((\d+)\)/); // Match the number inside parentheses
            if (match) {
                return Number(match[1]); // Return the matched number
            }
        }
        return null;
    }

    // gets the next page in the forum
    public async getNextPage(): Promise<CambridgeMTForumScraper | null> {
        const maxPages = this.getMaxPages();
        if (maxPages && this.pageNumber < maxPages) {
            // console.log("\n\Getting page", this.pageNumber + 1, "of", maxPages);
            const nextPageScraper = new CambridgeMTForumScraper(
                this.pageURLBase,
                this.pageNumber + 1,
                this.recording
            );

            await nextPageScraper.load(); 
            return nextPageScraper;
        }
        return null;
    }
}

// get all the threads for a forum page
export async function crawlForumPostingsForId(
    id: number,
    recording: MultitrackRecording
): Promise<ForumThread[]> {
    const allThreads: ForumThread[] = [];
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
    const uniqueIds = new Set(allThreads.map((t) => t.id));
    return allThreads.filter((thread) => uniqueIds.has(thread.id));
}

export async function crawlRecordingForumPosts(
    recording: MultitrackRecording
): Promise<ForumThread[]> {
    if (!recording.forumUrl) {
        throw new Error("No forum URL found for recording");
    }
    const forumId = getForumId(recording.forumUrl);
    return await crawlForumPostingsForId(forumId, recording);
}