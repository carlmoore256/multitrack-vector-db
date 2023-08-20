import { Generated } from "kysely";
import { IAudioFile } from "./audio-models.js";

export interface IGenre {
    id : string;
    name : string;
    subGenres? : string[];
}


export interface IArtist {
    id : string;
    name : string;
    genres? : IGenre[] | string[];
    description? : string;
}

export interface IArtistResource {
    id : string;
    artistId : string;
    uri : string;
}


export interface IMultitrackRecording {
    id : string;
    name : string;
    numTracks : number;
    artist : IArtist | string;
    genres : IGenre[] | string[];
    tags? : string[];
    files? : IAudioFile[] | string[];
    metadata? : any;
}


export type RecordingDownloadableResourceType = "multitrack" | "preview" | "forum" | "other";

export interface IRecordingDownloadableResource {
    id : string;
    type? : RecordingDownloadableResourceType;
    url : string;
    filename : string;
    bytes? : number | null;
    recordingId? : string | null;
}
