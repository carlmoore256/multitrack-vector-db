import { IArtist, IGenre } from "./types.js";
import { getTextContent, generateId } from "./utils.js";
import { CambridgeMTGenre } from "./Genre.js";

export class CambridgeMTArtist implements IArtist {

    constructor(
        public id : string,
        public name : string,
        public genres : CambridgeMTGenre[],
        public description? : string,
        public links? : string[],
    ) {}


    /**
     * Creates a CambridgeMTRecording from a page HTMLElement
     * @param {HTMLElement} element the page element that contains the recording
     */
    static fromElement(element: HTMLElement): CambridgeMTArtist {
        const artistElement = element.closest('.c-mtk__artist') as HTMLElement;
        
        if (!artistElement) {
          throw new Error("Could not find artist element");
        }

        const genreElement = artistElement.closest('.c-mtk__genre') as HTMLElement;
        const genre = CambridgeMTGenre.fromElement(genreElement);
        const genres = [genre];
        
        var name = getTextContent(artistElement, 'h4.m-container__title-bar-item span') as string;
        name = name.replace(/'/g, "").trim();

        const id = generateId();
        
        const description = getTextContent(artistElement, '.m-container__title-bar-item strong');
      
        var links = Array.from(artistElement.querySelectorAll('.m-container__header a')).map(a => a.getAttribute('href')) as string[];
        links = Array.from(new Set(links));
 
        if (!id || !name || !genres || !description || !links) {
            throw new Error("Could not parse recording");
        }

        return new CambridgeMTArtist(id, name, genres || [], description, links);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            genreIds: this.genres.map(g => g.id),
            description: this.description,
            links: this.links,
        }
    }
}


export function consolidateArtists(artists: CambridgeMTArtist[]): CambridgeMTArtist[] {
    const consolidated: { [name: string]: CambridgeMTArtist } = {};

    artists.forEach(artist => {
        // If an artist with this name has not been encountered yet, simply add the artist to the consolidated list
        if (!(artist.name in consolidated)) {
            consolidated[artist.name] = artist;
        } else {
            // If an artist with this name has already been encountered, consolidate the genres and links
            const existing = consolidated[artist.name];

            // Union of genres from existing and new artist. Assumes genres are objects with an id.
            existing.genres = [...existing.genres, ...artist.genres.filter(a => existing.genres.every(b => b.id !== a.id))];

            // Union of links from existing and new artist
            existing.links = Array.from(new Set([...(existing.links || []), ...(artist.links || [])]));

            // If descriptions differ, append the new description to the existing one
            if (existing.description !== artist.description) {
                existing.description = [existing.description, artist.description].filter(Boolean).join(' ');
            }
        }
    });

    return Object.values(consolidated);
}
