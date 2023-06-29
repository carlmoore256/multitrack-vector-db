export interface IForumThread {
    id : string;
    url : string;
    title : string;
    author : string;
    author_id? : string;
    replies? : number;
    views? : number;
    rating? : number | null;
    last_post_date? : string;
    has_attachment? : boolean;
    recording_id? : string;
}

export interface IForumPost {
    id: string;
    thread_id: string | null;
    author_id: string | null;
    username: string | null;
    date: string | Date | null;
    content: string | null;
    attachment_id: string | null;
}
  

export interface IForumUser {
    id: string;
    username: string;
    joined_date: string | null;
    posts_count: number | null;
    threads_count: number | null;
    profile_url: string;
}