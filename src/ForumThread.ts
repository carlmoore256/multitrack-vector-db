import { getThreadId, parseForumThreadPosts, IForumPostData } from "./forumParsers.js";
import { IForumUser, IForumThread } from "./models/forum-models.js";
import { CachedWebPage } from "./downloading/CachedWebPage.js";
import Debug, { LogColor } from "./utils/Debug.js";
import { IRecordingDownloadableResource } from "./models/cambridge-models.js";

export class CambridgeMTForumThreadScraper extends CachedWebPage {

    public threadId: number;

    constructor(public pageURLBase: string, public pageNumber: number = 1, public thread: IForumThread) {
        const fullPageURL = pageURLBase + "&page=" + pageNumber;
        super(`cambridge-forum-${getThreadId(pageURLBase)}`, fullPageURL);
        this.threadId = getThreadId(pageURLBase);
    }

    get postsElement(): HTMLElement {
        return this.page.querySelector("#posts") as HTMLElement;
    }

    public parse(): IForumPostData {
        return parseForumThreadPosts(this.postsElement, this.thread);
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
            const nextPageScraper = new CambridgeMTForumThreadScraper(this.pageURLBase, this.pageNumber + 1, this.thread);
            await nextPageScraper.load();
            return nextPageScraper;
        }
        return null;
    }



}

export function consolidateUsers(users: IForumUser[]): IForumUser[] {
    const consolidatedUsers = new Map<string, IForumUser>();
    for (const user of users) {
        if (user.id in consolidatedUsers) {
            continue;
        } else {
            consolidatedUsers.set(user.id, user);
        }
    }
    return Array.from(consolidatedUsers.values());
}

export function consolidateAttachments(attachments: IRecordingDownloadableResource[]): IRecordingDownloadableResource[] {
    const consolidatedAttachments = new Map<string, IRecordingDownloadableResource>();
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
        attachments: []
    };
    await scraper.load();
    while (scraper) {
        const { posts, users, attachments } = scraper.parse();

        allData.posts.push(...posts);
        allData.users.push(...users);
        allData.attachments.push(...consolidateAttachments(attachments)); // there might be repeats of attatchments

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