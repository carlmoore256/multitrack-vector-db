import { IMultitrackRecording, IRecordingDownloadableResource } from "../models/cambridge-models.js";
import { getTextContent, getAttributeValue, parseNumberFromString, generateId, generateHashId } from "../utils/utils.js";
import { CambridgeMTArtist } from "./Artist.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { IDatabaseWriteable } from "../database/IDatabaseObject.js";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { Debug } from "../utils/Debug.js";
import { STORAGE_ROOT } from "../definitions.js";



enum CambridgeMTMixType {
    FullPreview = "Full Preview",
    UnmasteredMix = "Unmastered Mix",
    ExcerptPreview = "Excerpt Preview",
}

type CambridgeMTMix = {
    fullPreview? : IRecordingDownloadableResource;
    excerptPreview? : IRecordingDownloadableResource;
}

export function getRecordingDestinationPath(
    recording : IMultitrackRecording,
) {
    const outputDir = path.join(STORAGE_ROOT, recording.id);
    if (!existsSync(outputDir)) {
        Debug.log(`Creating output directory: ${outputDir}`);
        mkdirSync(outputDir);
    }
    return outputDir;
}


export class CambridgeMTRecording implements IMultitrackRecording, IDatabaseWriteable {

    constructor(
        public id : string,
        public name : string,
        public num_tracks : number,
        public artist : any,
        public genres : any[],
        public tags? : string[],
        public files? : any[],
        public metadata? : any,
        public forumUrl? : string,
        public multitrackDownload? : IRecordingDownloadableResource,
        public previewDownload? : IRecordingDownloadableResource,
    ) {}


    /**
     * Creates a CambridgeMTRecording from a page HTMLElement
     * @param {HTMLElement} element the page element that contains the recording
     */
    static fromElement(element: HTMLElement) : CambridgeMTRecording {
        // Assuming 'self' is referencing the current object or context
        var name = getTextContent(element, 'span.m-mtk-track__name') as string;
        // remove any ' or \n characters
        name = name.replace(/'/g, "").trim();
        name = name.replace(/\n/g, " ");
        const id = generateId();
        
        const artistElement = element.closest('.m-container--artist');

        const artist = CambridgeMTArtist.fromElement(artistElement as HTMLElement);
        const genres = [...artist.genres];
        
        const numTracksString = getTextContent(element, 'span.m-mtk-download__count');
        const numTracks = parseInt(numTracksString?.split(" Tracks:")[0] as string);

        const tags : any = [];
        const files : any = [];
        const metadata : any = [];

        const forumUrl = getAttributeValue(element, 'p.m-mtk-track__forum-link a', 'href');
        const previewUrl = getAttributeValue(element, 'li.m-mtk-download.m-mtk-download--text-center a', 'href');
        
        // const multitrackUrl = getAttributeValue(element, 'li.m-mtk-download a', 'href');
        const fullDownloadUrl = getAttributeValue(element, 'span.m-mtk-download__links a', 'href');
        const fullDownloadSizeString = getTextContent(element, 'span.m-mtk-download__links');
        var fullDownloadSize = parseNumberFromString(fullDownloadSizeString?.split(" MB")[0] as string);
        // conver download size from MB to bytes
        fullDownloadSize = fullDownloadSize * 1024 * 1024;


        if (
            !id ||
            !name ||
            !numTracks ||
            !artist ||
            !genres ||
            !tags ||
            !files ||
            !metadata ||
            !forumUrl ||
            !fullDownloadUrl ||
            !previewUrl
          ) {
            throw new Error("Could not parse recording");
          }

        const multitrackDownload : IRecordingDownloadableResource = {
            id : generateHashId(fullDownloadUrl as string, 10),
            url : fullDownloadUrl as string,
            bytes : fullDownloadSize as number,
            filename : fullDownloadUrl?.split("/").pop() as string
        };

        const previewDownload : IRecordingDownloadableResource = {
            id : generateHashId(previewUrl as string, 10),
            url : previewUrl as string,
            filename : previewUrl?.split("/").pop() as string
        }
        
        return new CambridgeMTRecording(
            id,
            name,
            numTracks,
            artist,
            genres,
            tags,
            files,
            metadata,
            forumUrl,
            multitrackDownload,
            previewDownload
        );
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            num_tracks: this.num_tracks,
            artist_id: this.artist.id, // Return only the artist's ID
            genre_ids: this.genres.map(genre => genre.id), // Return an array of genre IDs
            tags: this.tags,
            files: this.files,
            metadata: this.metadata,
            forum_url: this.forumUrl,
            multitrack_download: this.multitrackDownload,
            preview_download: this.previewDownload
        };
    }

    async insertIntoDatabase(db : DatabaseClient) : Promise<any> {
        // await db.query(`INSERT INTO multitrack_recording (id, name, numTracks, artistId, metadata) VALUES (?, ?, ?, ?, ?)`, 
        //     [this.id, this.name, this.numTracks, this.artist.id, JSON.stringify(this.metadata)]);
         
        const mtInsertSuccess = await db.insert("multitrack_recording", {
            id: this.id,
            name: this.name,
            num_tracks: this.num_tracks,
            artist_id: this.artist.id,
            metadata: JSON.stringify(this.metadata ? this.metadata : {}),
            forum_url: this.forumUrl
        });
        if(!mtInsertSuccess) {
            return false;
        }

        for(const genre of this.genres) {
            
            const genreInsertSuccess = await db.insert("recording_genre", {
                recording_id: this.id,
                genre_id: genre.id
            });
            if(!genreInsertSuccess) {
                return false;
            }
        }

        const multitrackDlInsertSuccess = await db.insert("multitrack_recording_download", {
            id : this.multitrackDownload?.id,
            type : "multitrack",
            filename : this.multitrackDownload?.filename,
            url : this.multitrackDownload?.url,
            bytes : this.multitrackDownload?.bytes,
            recording_id : this.id
        })
        if(!multitrackDlInsertSuccess) {
            return false;
        }

        const previewDlInsertSuccess = await db.insert("multitrack_recording_download", {
            id : this.previewDownload?.id,
            type : "preview",
            filename : this.previewDownload?.filename,
            url : this.previewDownload?.url,
            recording_id : this.id
        });
        if(!previewDlInsertSuccess) {
            return false;
        }
        return true;
    }
}