import { Generated } from "kysely";
import { IAudioFile } from "./audio-models.js";

export interface IGenreEntity {
    id : string;
    name : string;
    subGenres? : string[];
}


export interface IArtistEntity {
    id : string;
    name : string;
    genres : string[]; // ids to genres
    description : string;
}

export interface IArtistResourceEntity {
    id : string;
    artistId : string;
    url : string;
}


export interface IMultitrackRecordingEntity {
    id : string;
    name : string;
    numTracks : number;
    artistId : string;
    metadata : string;
}

export interface IDownloadableResourceEntity {
    url : string;
    filename : string;
    bytes : number;
}

export interface IForumThreadEntity {
    id : number;
    url : string;
    title : string;
    author : string;
    replies? : number;
    views? : number;
    rating? : number | null;
    lastPostDate? : string;
    hasAttachment? : boolean;
}

// connects an audio file to a recording
export interface IRecordingFileEntity {
    recording_id : string;
    file_id : string;
}

