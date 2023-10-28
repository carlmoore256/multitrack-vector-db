import { getTextContent, getAttributeValue } from "../utils/utils.js";
import Debug, { LogColor } from "../utils/debug.js";
import { CambridgeMTArtist } from "./Artist.js";
import { CambridgeMTRecording } from "./MultitrackRecording.js";

import {
    ForumThread,
    ForumPost,
    ForumUser,
    MultitrackRecordingDownload,
    MultitrackRecording,
    MultitrackDownloadType,
} from "@prisma/client";

export const getCambridgeForumListingURL = (forumId: number): string => {
    return (
        "https://discussion.cambridge-mt.com/forumdisplay.php?fid=" + forumId
    );
};

export const getCambridgeForumThreadURL = (threadId: number): string => {
    return "https://discussion.cambridge-mt.com/showthread.php?tid=" + threadId;
};

export const getUserId = (url: string): number => {
    const userId = parseInt(new URL(url).searchParams.get("uid") as string);
    if (!userId) {
        throw new Error("Invalid user URL");
    }
    return userId;
};

export const getForumId = (url: string): number => {
    const forumId = parseInt(new URL(url).searchParams.get("fid") as string);
    if (!forumId) {
        throw new Error("Invalid forum URL");
    }
    return forumId;
};

export const getThreadId = (url: string): number => {
    const threadId = parseInt(new URL(url).searchParams.get("tid") as string);
    if (!threadId) {
        throw new Error("Invalid thread URL");
    }
    return threadId;
};

export function parseThread(
    element: HTMLElement,
    recording: MultitrackRecording
): ForumThread | null {
    // Get id from href attribute of thread title link
    let threadUrl = getAttributeValue(element, ".subject_new a", "href");
    if (!threadUrl) {
        return null;
    }

    const id = threadUrl ? Number(threadUrl.split("=")[1]) : null;

    if (!threadUrl?.includes("discussion.cambridge-mt.com")) {
        threadUrl = getCambridgeForumThreadURL(id as number);
    }

    // const id = threadUrl ? getThreadId(threadUrl) : null;
    // Extract other necessary information
    const title = getTextContent(element, ".subject_new a");
    const author = getTextContent(element, ".author a");
    const authorId = getAttributeValue(element, ".author a", "href")
        ? getUserId(getAttributeValue(element, ".author a", "href") as string)
        : null;
    const replies = getTextContent(element, "td:nth-child(4) a");
    const views = getTextContent(element, "td:nth-child(5)")?.replace(",", "");
    const ratingText = getTextContent(element, ".star_rating .current_rating");
    const rating = ratingText
        ? Number(ratingText.split("-")[1].trim().split(" ")[0])
        : null;
    const lastPostDate = getTextContent(element, ".lastpost");
    // Check for the existence of an attachment
    const attachmentImage = element.querySelector(".float_right img");
    const hasAttachment =
        attachmentImage &&
        attachmentImage.getAttribute("title") ===
            "This thread contains 1 attachment.";
    if (id && title && author) {
        // Create and return the thread object
        return {
            id: id.toString(),
            url: threadUrl,
            title,
            author,
            authorId: authorId ? authorId.toString() : null,
            replies: replies ? parseInt(replies) : null,
            views: views ? parseInt(views) : null,
            rating,
            lastPostDate: lastPostDate
                ? lastPostDate.split(",")[0].trim()
                : null,
            hasAttachment: hasAttachment || false,
            recordingId: recording.id,
        };
    }
    // Return null if necessary information is missing
    return null;
}

export function parseAttachment(
    postElement: HTMLElement | Element,
    attachmentType: MultitrackDownloadType = MultitrackDownloadType.FORUM
): MultitrackRecordingDownload | null {
    const attachmentElements = Array.from(
        postElement.querySelectorAll("fieldset")
    );

    const res = attachmentElements.map((attachmentElement) => {
        const url = getAttributeValue(attachmentElement, "source", "src");
        const fileInfo = getTextContent(attachmentElement, "a");
        const id = url?.split("aid=")[1];

        // Extract filename and size
        // const match = fileInfo?.match(/(.+)\s--\s\(Download:\s(\d+\.\d+)\sMB\)/);
        const regex = /Download:\s+(\d+\.\d+)\s+MB/;
        const match = fileInfo?.match(regex);

        // const filename = match ? match[1] : null;
        const sizeInMB = match ? parseFloat(match[1]) : null;
        const bytes = sizeInMB ? Math.round(sizeInMB * 1024 * 1024) : null;

        const filenameRegex = /&nbsp;&nbsp;\s*(.*?)\s*&nbsp;--&nbsp;/;
        const test = attachmentElement.outerHTML?.match(filenameRegex);
        let filename;
        if (test && test[1]) {
            filename = test[1];
        }

        return {
            id: id || null,
            type: attachmentType,
            url: url || null,
            filename: filename || null,
            bytes: bytes || null,
        };
    });

    if (res.length === 0) {
        return null;
    }

    return res[0] as MultitrackRecordingDownload;
}

// function parsePost(postElement : HTMLElement | Element) : IForumPost {
//     const attachment = parseAttachment(postElement);
//     let attachmentId = (attachment ? attachment.id : null);
//     return {
//         id: postElement.id.split("post_")[1],
//         authorId: getTextContent(postElement, '.author_information span a'),
//         date: parsePostDate(getTextContent(postElement, '.post_date') as string),
//         content: getTextContent(postElement, '.post_body'),
//         attachmentId
//     }
// };

export function parseUser(
    postElement: HTMLElement | Element
): ForumUser | null {
    // User id is derived from the profile URL
    const profileUrl = getAttributeValue(
        postElement,
        ".author_information a",
        "href"
    );
    const id = profileUrl?.split("uid=")[1] || null;

    // Username
    const username = getTextContent(postElement, ".author_information a");

    // Location
    const location = getTextContent(
        postElement,
        ".author_information .smalltext"
    );

    // User stats
    const userStats = getTextContent(postElement, ".author_statistics") || "";
    const postsCount =
        parseInt(userStats.match(/Posts:\s(\d+)/)?.[1] as string) || 0;
    const threadsCount =
        parseInt(userStats.match(/Threads:\s(\d+)/)?.[1] as string) || 0;
    const joinedDate = userStats.match(/Joined:\s(.+)/)?.[1] || "";

    // Website URL
    const websiteUrl = getAttributeValue(
        postElement,
        ".postbit_website",
        "href"
    );

    // Find user URL
    const findUserUrl = getAttributeValue(postElement, ".postbit_find", "href");

    if (id && username && profileUrl) {
        return {
            id,
            username,
            joinedDate: joinedDate,
            postsCount: postsCount,
            threadsCount: threadsCount,
            profileUrl: profileUrl,
        };
    } else {
        return null;
    }
}

export interface IForumPostData {
    posts: ForumPost[];
    users: ForumUser[];
    downloads: MultitrackRecordingDownload[];
}

export function parseForumThreadPosts(
    postsElement: HTMLElement,
    thread: ForumThread
): IForumPostData {
    const postElements = Array.from(postsElement.querySelectorAll(".post"));
    const posts: ForumPost[] = [];
    const downloads: MultitrackRecordingDownload[] = [];
    const users = new Map<string, ForumUser>();

    for (const postElement of postElements) {
        const attachment = parseAttachment(postElement);
        if (attachment) {
            attachment.recordingId = thread.recordingId;
            downloads.push(attachment);
        }

        let attachmentId = attachment ? attachment.id : null;

        posts.push({
            id: postElement.id.split("post_")[1],
            threadId: thread.id,
            authorId:
                getAttributeValue(
                    postElement,
                    ".author_information span a",
                    "href"
                )?.split("uid=")[1] || null,
            username: getTextContent(postElement, ".author_information span a"),
            date: parsePostDate(
                getTextContent(postElement, ".post_date") as string
            ),
            content: getTextContent(postElement, ".post_body"),
            attachmentId: attachmentId,
        });

        const user = parseUser(postElement);

        user && users.set(user.id, user);
    }

    return {
        posts,
        users: Array.from(users.values()),
        downloads: downloads,
    };
}

export function parsePostDate(input: string) {
    const [datePart, timePart] = input.split(", ");
    const [day, month, year] = datePart.split("-");
    let [hours, minutes] = timePart.split(":");
    // hours = hours.trim()
    // remove leading zeros
    let hoursNum = parseInt(hours.trim().replace(/^0+/, ""));

    const period = minutes.slice(-2); // AM or PM
    minutes = minutes.slice(0, -3); // remove AM or PM from minutes

    // convert hours to 24 hour format if it is PM
    if (period === "PM") {
        hoursNum = (+hoursNum + 12) % 24; // use modulus 24 to convert 12 PM to 0
    }

    // construct a standard date string
    const standardDateStr = `${month}/${day}/${year} ${hoursNum}:${minutes}`;

    return new Date(standardDateStr);
}
