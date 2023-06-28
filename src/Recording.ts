import { IMultitrackRecording, IDownloadableResource } from "./types.js";
import { getTextContent, getAttributeValue, parseNumberFromString, generateId } from "./utils.js";
import { CambridgeMTArtist } from "./Artist.js";

enum CambridgeMTMixType {
    FullPreview = "Full Preview",
    UnmasteredMix = "Unmastered Mix",
    ExcerptPreview = "Excerpt Preview",
}

type CambridgeMTMix = {
    fullPreview? : IDownloadableResource;
    excerptPreview? : IDownloadableResource;
}


export class CambridgeMTRecording implements IMultitrackRecording {

    constructor(
        public id : string,
        public name : string,
        public numTracks : number,
        public artist : any,
        public genres : any[],
        public tags? : string[],
        public files? : any[],
        public metadata? : any,
        private download? : IDownloadableResource,
        private forumUrl? : string,
        private previewUrl? : string,
    ) {}


    /**
     * Creates a CambridgeMTRecording from a page HTMLElement
     * @param {HTMLElement} element the page element that contains the recording
     */
    static fromElement(element: HTMLElement) : CambridgeMTRecording {
        
        // const name = element.querySelector("span")
        // Assuming 'self' is referencing the current object or context
        var name = getTextContent(element, 'span.m-mtk-track__name') as string;

        // remove any ' or \n characters
        name = name.replace(/'/g, "").trim();
        name = name.replace(/\n/g, " ");

        // name = name.replace(/'/g, "").trim();
        const id = generateId();
        
        const artistElement = element.closest('.m-container--artist');
        // const artist = artistElement?.querySelector('.m-container__title-bar-item')?.textContent?.trim();

        const artist = CambridgeMTArtist.fromElement(artistElement as HTMLElement);
        const genres = [...artist.genres];
        // const genres = ["baz"];
        
        const numTracksString = getTextContent(element, 'span.m-mtk-download__count');
        const numTracks = parseInt(numTracksString?.split(" Tracks:")[0] as string);

        const tags : any = [];
        const files : any = [];
        const metadata : any = [];

        const forumUrl = getAttributeValue(element, 'p.m-mtk-track__forum-link a', 'href');
        const previewUrl = getAttributeValue(element, 'li.m-mtk-download.m-mtk-download--text-center a', 'href');
        
        // const multitrackUrl = getAttributeValue(element, 'li.m-mtk-download a', 'href');
        const downloadUrl = getAttributeValue(element, 'span.m-mtk-download__links a', 'href');
        const downloadSizeString = getTextContent(element, 'span.m-mtk-download__links');
        var downloadSize = parseNumberFromString(downloadSizeString?.split(" MB")[0] as string);
        // conver download size from MB to bytes
        downloadSize = downloadSize * 1024 * 1024;

        const downloadFilename = downloadUrl?.split("/").pop();        

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
            !downloadUrl ||
            !previewUrl
          ) {
            throw new Error("Could not parse recording");
          }

        const downloadableResource : IDownloadableResource = {
            url : downloadUrl as string,
            bytes : downloadSize as number,
            filename : downloadFilename as string
        };
        
        return new CambridgeMTRecording(
            id,
            name,
            numTracks,
            artist,
            genres,
            tags,
            files,
            metadata,
            downloadableResource,
            forumUrl,
            previewUrl
        );
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            numTracks: this.numTracks,
            artistId: this.artist.id, // Return only the artist's ID
            genreIds: this.genres.map(genre => genre.id), // Return an array of genre IDs
            tags: this.tags,
            files: this.files,
            metadata: this.metadata,
            download: this.download,
            forumUrl: this.forumUrl,
            previewUrl: this.previewUrl
        };
    }
}