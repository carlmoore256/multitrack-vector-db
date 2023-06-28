import { getCambridgeForumListingURL, getForumId, parseThread } from "./forumParsers.js";
import { CachedWebPage } from "./CachedWebPage.js";
import { IForumThread } from "./types.js";

const FORUM_BASE_URL = "discussion.cambridge-mt.com/forumdisplay.php?fid=";



export class CambridgeMTForumScraper extends CachedWebPage {

    public forumId : number;

    constructor(public pageURLBase : string, public pageNumber : number = 1) {
        const fullPageURL = pageURLBase + "&page=" + pageNumber;
        console.log("CambridgeMTForumScraper", fullPageURL);
        super(`cambridge-forum-${getForumId(pageURLBase)}`, fullPageURL);
        this.forumId = getForumId(pageURLBase);
    }

    static fromId(id : number) : CambridgeMTForumScraper {
        const pageURL = getCambridgeForumListingURL(id);
        return new CambridgeMTForumScraper(pageURL);
    }

    public getStickyThread() : any | null {        
        const element = this.page.querySelector("#content table") as HTMLElement;
        const stickiedElements = element.querySelectorAll("tr.inline_row"); // Select all stickied rows
        stickiedElements.forEach((row) => {
        const tdElement = row.querySelector("td.trow1.forumdisplay_sticky"); // Select the desired td element within each row
        if (tdElement) {
            console.log(tdElement.textContent); // Example: Output the text content of the td element
        }
        });
    }

    public getThreads() : IForumThread[] {
        const elements = this.page.querySelectorAll("tr.inline_row");
        const threads : any[] = [];
        elements.forEach((element) => {
            const thread = parseThread(element as HTMLElement);
            if (thread) threads.push(thread);
        });
        return threads;
    }

    public getMaxPages(): number | null {
        const pagesSpan = this.page.querySelector(".pages");
        console.log("pagesSpan", pagesSpan?.outerHTML);
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
            console.log("\n\nGetting next page", this.pageNumber + 1, "of", maxPages);
            const nextPageScraper = new CambridgeMTForumScraper(this.pageURLBase, this.pageNumber + 1);
            await nextPageScraper.load();
            return nextPageScraper;
        }
        console.error("No next page found, maxPages:", maxPages, "pageNumber:", this.pageNumber);
        return null;
    }
    
}

// get all the threads for a forum page
export async function crawlForumPostingsForId(id : number) : Promise<IForumThread[]> {
    const allThreads : IForumThread[] = [];
    var scraper = CambridgeMTForumScraper.fromId(id);
    await scraper.load();

    while (scraper) {
        console.log("Crawling page", scraper.pageNumber);
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
    console.log(`Found ${uniqueThreads.length} threads for forum ${id}`);
    return uniqueThreads;
}

export async function crawlForumPostingsForURL(url : string) : Promise<IForumThread[]> {
    const id = getForumId(url);
    return crawlForumPostingsForId(id);
}

// export class CambridgeMTForumThreadScraper extends CachedWebPage {
    
// }


// class CambridgeMTForumDisplay {
    
//     constructor(
//         public numPages : number,
//         public currentPage : number,
//         public pageURLs : string[],

//     ) {}


//     getAboutPage() : Promise<CambridgeMTForumPost> {

//     }
// }

// // each span with class subject_new, with id that starts with tid_
// // has an anchor tag that leads to a post
// class CambridgeMTForumPost {
//     public stars : number;
// }