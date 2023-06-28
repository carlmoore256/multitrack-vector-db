import { getTextContent, getAttributeValue } from "./utils.js";
import { IForumThread } from "./types.js";


export const getCambridgeForumListingURL = (forumId : number) : string  => {
    return "https://discussion.cambridge-mt.com/forumdisplay.php?fid=" + forumId;
}

export const getCambridgeForumThreadURL = (threadId : number) : string => {
    return "https://discussion.cambridge-mt.com/showthread.php?tid=" + threadId;
}

export const getForumId = (url : string) : number => {
    const forumId = parseInt(new URL(url).searchParams.get("fid") as string);
    if (!forumId) {
        throw new Error("Invalid forum URL");
    }
    return forumId;
}

export function parseThread(element: HTMLElement): IForumThread | null {
    // Get id from href attribute of thread title link
    const threadUrl = getAttributeValue(element, ".subject_new a", "href");
    const id = threadUrl ? Number(threadUrl.split('=')[1]) : null;
    // Extract other necessary information
    const title = getTextContent(element, ".subject_new a");
    const author = getTextContent(element, ".author a");
    const replies = getTextContent(element, "td:nth-child(4) a");
    const views = getTextContent(element, "td:nth-child(5)");
    const ratingText = getTextContent(element, ".star_rating .current_rating");
    const rating = ratingText ? Number(ratingText.split('-')[1].trim().split(' ')[0]) : null;
    const lastPostDate = getTextContent(element, ".lastpost");        
    // Check for the existence of an attachment
    const attachmentImage = element.querySelector(".float_right img");
    const hasAttachment = attachmentImage && attachmentImage.getAttribute("title") === "This thread contains 1 attachment.";
    if (id && title && author) {
        // Create and return the thread object
        return {
            id,
            url: threadUrl || '',
            title,
            author,
            replies: replies ? Number(replies) : undefined,
            views: views ? Number(views) : undefined,
            rating,
            lastPostDate: lastPostDate ? lastPostDate.split(',')[0].trim() : undefined,
            hasAttachment : hasAttachment ? true : undefined,
        };
    }
    // Return null if necessary information is missing
    return null;
}
