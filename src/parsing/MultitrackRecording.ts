import {
    IMultitrackRecording,
    IRecordingDownloadableResource,
} from "../models/cambridge-models.js";
import {
    getTextContent,
    getAttributeValue,
    parseNumberFromString,
    generateId,
    generateHashId,
} from "../utils/utils.js";
import { CambridgeMTArtist } from "./Artist.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { IDatabaseWriteable } from "../database/IDatabaseObject.js";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { Debug } from "../utils/Debug.js";
import { STORAGE_ROOT } from "../definitions.js";

import {
    PrismaClient,
    MultitrackRecording,
    MultitrackRecordingDownload,
    MultitrackDownloadType,
    Prisma
} from "@prisma/client";
import { CambridgeMTGenre } from "./Genre.js";

enum CambridgeMTMixType {
    FullPreview = "Full Preview",
    UnmasteredMix = "Unmastered Mix",
    ExcerptPreview = "Excerpt Preview",
}

type CambridgeMTMix = {
    fullPreview?: IRecordingDownloadableResource;
    excerptPreview?: IRecordingDownloadableResource;
};

export function getRecordingDestinationPath(recording: MultitrackRecording) {
    const outputDir = path.join(STORAGE_ROOT, recording.id);
    if (!existsSync(outputDir)) {
        Debug.log(`Creating output directory: ${outputDir}`);
        mkdirSync(outputDir);
    }
    return outputDir;
}

export class CambridgeMTRecording
    implements IDatabaseWriteable<MultitrackRecording>
{
    // multitrackRecording: MultitrackRecording;

    constructor(
        // public multitrackRecording: MultitrackRecording,
        public name: string,
        public numTracks: number,
        public artist: CambridgeMTArtist,
        public genres: CambridgeMTGenre[],
        public tags?: string[],
        public files?: any[],
        public metadata?: any,
        public forumUrl?: string, // public multitrackDownload?: IRecordingDownloadableResource, // public previewDownload?: IRecordingDownloadableResource
        public downloads?: Omit<MultitrackRecordingDownload, "recordingId">[]
    ) {}

    /**
     * Creates a CambridgeMTRecording from a page HTMLElement
     * @param {HTMLElement} element the page element that contains the recording
     */
    static fromElement(element: HTMLElement): CambridgeMTRecording {
        // Assuming 'self' is referencing the current object or context
        var name = getTextContent(element, "span.m-mtk-track__name") as string;
        // remove any ' or \n characters
        name = name.replace(/'/g, "").trim();
        name = name.replace(/\n/g, " ");

        const artistElement = element.closest(".m-container--artist");

        const artist = CambridgeMTArtist.fromElement(
            artistElement as HTMLElement
        );
        const genres = [...artist.genres];

        const numTracksString = getTextContent(
            element,
            "span.m-mtk-download__count"
        );
        const numTracks = parseInt(
            numTracksString?.split(" Tracks:")[0] as string
        );

        const tags: any = [];
        const files: any = [];
        const metadata: any = [];

        const forumUrl = getAttributeValue(
            element,
            "p.m-mtk-track__forum-link a",
            "href"
        );
        const previewUrl = getAttributeValue(
            element,
            "li.m-mtk-download.m-mtk-download--text-center a",
            "href"
        );

        // const multitrackUrl = getAttributeValue(element, 'li.m-mtk-download a', 'href');
        const fullDownloadUrl = getAttributeValue(
            element,
            "span.m-mtk-download__links a",
            "href"
        );
        const fullDownloadSizeString = getTextContent(
            element,
            "span.m-mtk-download__links"
        );
        var fullDownloadSize = parseNumberFromString(
            fullDownloadSizeString?.split(" MB")[0] as string
        );
        // conver download size from MB to bytes
        fullDownloadSize = fullDownloadSize * 1024 * 1024;

        if (
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

        return new CambridgeMTRecording(
            name,
            numTracks,
            artist,
            genres,
            tags,
            files,
            metadata,
            forumUrl,
            [
                {
                    id: generateHashId(fullDownloadUrl as string, 10),
                    type: MultitrackDownloadType.MULTITRACK,
                    filename: fullDownloadUrl?.split("/").pop() as string,
                    url: fullDownloadUrl as string,
                    bytes: BigInt(fullDownloadSize),
                },
                {
                    id: generateHashId(previewUrl as string, 10),
                    type: MultitrackDownloadType.PREVIEW,
                    filename: previewUrl?.split("/").pop() as string,
                    url: previewUrl as string,
                    bytes: BigInt(0),
                },
            ]
        );
    }

    async insertIntoDatabase(
        client: PrismaClient
    ): Promise<MultitrackRecording> {
        const multitrackRecording = await client.multitrackRecording.upsert({
            where: {
                name_artistId: {
                    name: this.name,
                    artistId: this.artist.id,
                } 
            },
            update: {},
            create: {
                name: this.name,
                numTracks: this.numTracks,
                metadata: this.metadata,
                forumUrl: this.forumUrl,
                artist: {
                    connect: {
                        id: this.artist.id,
                    },
                },
                recordingGenres: {
                    create: this.genres.map((g) => ({
                        genre: {
                            connectOrCreate: {
                                where: {
                                    name: g.name,
                                },
                                create: {
                                    name: g.name,
                                    subGenres: g.subGenres,
                                },
                            },
                        },
                    })),
                },
                multitrackRecordingDownloads: {
                    create: this.downloads?.map((d) => ({
                        ...d,
                    })),
                }
            },
        });

        // this.genres.map(async (genre) => {
        //     await client.multitrackRecordingGenre.create({
        //         data: {
        //             genre: {
        //                 connect: {
        //                     name: genre.name,
        //                 },
        //             },
        //             multitrackRecording: {
        //                 connect: {
        //                     id: multitrackRecording.id,
        //                 },
        //             },
        //         },
        //     });
        // });

        // this.downloads?.map(async (download) => {
        //     await client.multitrackRecordingDownload.create({
        //         data: {
        //             ...download,
        //             multitrackRecording: {
        //                 connect: {
        //                     id: multitrackRecording.id,
        //                 },
        //             },
        //         },
        //     });
        // });

        return multitrackRecording;
    }
}

// const multitrackDownload: MultitrackRecordingDownload = {
//     id: generateHashId(fullDownloadUrl as string, 10),
//     type: MultitrackDownloadType.MULTITRACK,
//     filename: fullDownloadUrl?.split("/").pop() as string,
//     url: fullDownloadUrl as string,
//     bytes: BigInt(fullDownloadSize),
//     recordingId: id,
// };

// const previewDownload: MultitrackRecordingDownload = {
//     id: generateHashId(previewUrl as string, 10),
//     type: MultitrackDownloadType.PREVIEW,
//     filename: previewUrl?.split("/").pop() as string,
//     url: previewUrl as string,
//     bytes: BigInt(0),
//     recordingId: id,
// };
// getDownload(type: MultitrackDownloadType): MultitrackRecordingDownload {
//     switch (type) {
//         case MultitrackDownloadType.MULTITRACK:
//             return {
//                 id: generateHashId(fullDownloadUrl as string, 10),
//                 type: MultitrackDownloadType.MULTITRACK,
//                 filename: fullDownloadUrl?.split("/").pop() as string,
//                 url: fullDownloadUrl as string,
//                 bytes: BigInt(fullDownloadSize),
//                 recordingId: this.id,
//             };
//         case MultitrackDownloadType.PREVIEW:
//             return {
//                 id: generateHashId(previewUrl as string, 10),
//                 type: MultitrackDownloadType.PREVIEW,
//                 filename: previewUrl?.split("/").pop() as string,
//                 url: previewUrl as string,
//                 bytes: BigInt(0),
//                 recordingId: this.id,
//             };
//     }
// }
// toJSON() {
//     return {
//         id: this.id,
//         name: this.name,
//         num_tracks: this.numTracks,
//         artist_id: this.artist.id, // Return only the artist's ID
//         genre_ids: this.genres.map((genre) => genre.id), // Return an array of genre IDs
//         tags: this.tags,
//         files: this.files,
//         metadata: this.metadata,
//         forum_url: this.forumUrl,
//         // multitrack_download: this.multitrackDownload,
//         // preview_download: this.previewDownload,
//     };
// }
