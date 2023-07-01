import { IArtist, IGenre, IArtistResource } from "../models/cambridge-models.js";
import { getTextContent, generateId, generateHashId } from "../utils/utils.js";
import { CambridgeMTGenre } from "./Genre.js";
import { IDatabaseWriteable } from "../database/IDatabaseObject.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { CambridgeMTRecording } from "./MultitrackRecording.js";
import pg from "pg";

export class CambridgeMTArtist implements IArtist, IDatabaseWriteable {

    public id : string;

    constructor(
        public name : string,
        public genres : CambridgeMTGenre[],
        public description? : string,
        public links? : string[],
    ) {
        this.id = generateHashId(name, 10);
    }


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

        // const id = generateId();
        
        const description = getTextContent(artistElement, '.m-container__title-bar-item strong');
      
        var links = Array.from(artistElement.querySelectorAll('.m-container__header a')).map(a => a.getAttribute('href')) as string[];
        links = Array.from(new Set(links));
 
        if (!name || !genres || !description || !links) {
            throw new Error("Could not parse recording");
        }

        return new CambridgeMTArtist(name, genres || [], description, links);
    }



    toJSON() {
        return {
            id: this.id,
            name: this.name,
            genres: this.genres.map(g => g.id),
            description: this.description,
            links: this.links,
        }
    }

    public static fromJSON(json : any) {
        return new CambridgeMTArtist(json.name, [], json.description, json.links);
    }

    async insertIntoDatabase(db : DatabaseClient) {

        const artistSuccess = await db.insert('artist', {
            id: this.id,
            name: this.name,
            description: this.description
        });
        if (!artistSuccess) {
            return false;
        }

        for (const link of this.links || []) {
            const resourceSuccess = await db.insert('artist_resource', {
                id: generateId(),
                artist_id: this.id,
                uri: link
            });
            if (!resourceSuccess) {
                return false;
            }
        }

        for (const genre of this.genres || []) {
            const genreSuccess = await db.insert('artist_genre', {
                artist_id: this.id,
                genre_id: genre.id
            });
            if (!genreSuccess) {
                return false;
            }
        }

        return true;
    }

    static async fromDatabase(db : DatabaseClient, id : string) {
        const artist = await db.getById('artist', id);
        if (!artist) {
            return null;
        }

        const resources = await db.selectOne('artist_resource', { artistId: id }) as IArtistResource[];
        const genres = await db.selectOne('artist_genre', { artistId: id }) as IGenre[];

        return new CambridgeMTArtist(
            artist.name,
            genres.map(g => new CambridgeMTGenre(g.name, g.sub_genres || [])),
            artist.description,
            resources.map(r => r.uri)
        );
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


// export function consolidateArtistRecordings(recordings : CambridgeMTRecording) {
//     // const consolidated : { [name : string] : CambridgeMTRecording } = {};

//     recordings.forEach(recording => {
//         if ()
// }
