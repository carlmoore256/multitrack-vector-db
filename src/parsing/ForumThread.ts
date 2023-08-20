import { getThreadId, parseForumThreadPosts, IForumPostData } from "./forum-parsers.js";
import { IForumUser, IForumThread } from "../models/forum-models.js";
import { CachedWebPage } from "../downloading/CachedWebPage.js";
import Debug, { LogColor } from "../utils/Debug.js";
import { IRecordingDownloadableResource } from "../models/cambridge-models.js";
import { ForumThread, ForumUser, MultitrackRecordingDownload } from "@prisma/client";

export class CambridgeMTForumThreadScraper extends CachedWebPage {

    // public threadId: number;

    constructor(public thread: ForumThread, public pageNumber: number = 1) {
        const fullPageURL = thread.url + "&page=" + pageNumber;
        // const threadId = getThreadId(pageURLBase || thread.url);
        super(`cambridge-forum-${thread.id}`, fullPageURL);
    }

    get postsElement(): HTMLElement {
        return this.page.querySelector("#posts") as HTMLElement;
    }

    public parse(): IForumPostData | null {
        try {
            return parseForumThreadPosts(this.postsElement, this.thread);
        } catch (e) {
            Debug.error("Error parsing forum thread page");
            return null;
        }
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
    public async getNextPage(): Promise<CambridgeMTForumThreadScraper | null> {
        const maxPages = this.getMaxPages();
        if (maxPages && this.pageNumber < maxPages) {
            Debug.log("\n\Getting page " + this.pageNumber + 1 + " of " + maxPages);
            const nextPageScraper = new CambridgeMTForumThreadScraper(this.thread, this.pageNumber + 1);
            await nextPageScraper.load();
            return nextPageScraper;
        }
        return null;
    }



}

export function consolidateUsers(users: ForumUser[]): ForumUser[] {
    const consolidatedUsers = new Map<string, ForumUser>();
    for (const user of users) {
        if (user.id in consolidatedUsers) {
            continue;
        } else {
            consolidatedUsers.set(user.id, user);
        }
    }
    return Array.from(consolidatedUsers.values());
}

export function consolidateAttachments(attachments: MultitrackRecordingDownload[]): MultitrackRecordingDownload[] {
    const consolidatedAttachments = new Map<string, MultitrackRecordingDownload>();
    for (const attachment of attachments) {
        if (!attachment.id) {
            continue;
        }
        if (attachment.id in consolidatedAttachments) {
            continue;
        } else {
            consolidatedAttachments.set(attachment.id, attachment);
        }
    }
    return Array.from(consolidatedAttachments.values());
}


export async function crawlForumThreads(scraper: CambridgeMTForumThreadScraper): Promise<IForumPostData> {
    const allData: IForumPostData = {
        posts: [],
        users: [],
        downloads: []
    };
    await scraper.load();
    while (scraper) {
        const parsed = scraper.parse();
        if (!parsed) {
            Debug.error("Error parsing forum thread page");
            return allData;
        }
        const { posts, users, downloads: attachments } = parsed;

        allData.posts.push(...posts);
        allData.users.push(...users);
        allData.downloads.push(...consolidateAttachments(attachments)); // there might be repeats of attatchments

        // users will post in multiple forums, but we just want a single one
        allData.users = consolidateUsers(allData.users);

        const nextScraper = await scraper.getNextPage();
        if (!nextScraper) {
            break;
        } else {
            scraper = nextScraper;
        }
    }

    // allData.users = consolidateUsers(allData.users);
    return allData;
}