export interface IForumThread {
    id : string;
    url : string;
    title : string;
    author : string;
    authorId? : string;
    replies? : number;
    views? : number;
    rating? : number | null;
    lastPostDate? : string;
    hasAttachment? : boolean;
    recordingId? : string;
}

export interface IForumPost {
    id: string;
    threadId: string | null;
    authorId: string | null;
    username: string | null;
    date: string | Date | null;
    content: string | null;
    vector?: number[];
    attachmentId: string | null;
}
  

export interface IForumUser {
    id: string;
    username: string;
    joinedDate: string | null;
    postsCount: number | null;
    threadsCount: number | null;
    profileUrl: string;
}