import { IGenre } from "./models/cambridge-models.js";
import { DatabaseClient } from "./database/DatabaseClient.js";
import { IDatabaseWriteable } from "./database/IDatabaseObject.js";
import { Debug, LogColor } from "./utils/Debug.js";
export class CambridgeMTGenre implements IGenre, IDatabaseWriteable {

    public id : string;
    public sub_genres: string[];

    constructor( 
        public name: string, 
        subGenres: string[]
    ) {
        this.id = name.toLowerCase();
        this.sub_genres = Array.from(new Set(subGenres));
        this.sub_genres = this.sub_genres.filter(s => s !== name);
    }

    /**
     * Creates a genre from a page HTMLElement
     * @param {HTMLElement} element the page element that contains the genre
     */
    static fromElement(element: HTMLElement) : CambridgeMTGenre {
        const name = element.querySelector("h3")?.id as string;
        const subGenres = element.querySelector("h3 span")?.textContent?.split(" / ");
        
        if (!name || !subGenres) {
            throw new Error("Could not parse genre");
        }
        return new CambridgeMTGenre(name, subGenres);
    }


    async insertIntoDatabase(db : DatabaseClient) : Promise<boolean> {
        try {
            return await db.insert('genre', {
                id: this.id,
                name: this.name,
                sub_genres: this.sub_genres,
            });
        } catch (e) {
            Debug.log(e as string, LogColor.Red, "[ERROR]", true);
            return false;
        }
    }
}

export function consolidateGenres(genres: CambridgeMTGenre[]): CambridgeMTGenre[] {
    const genreMap = new Map<string, CambridgeMTGenre>();

    for (const genre of genres) {
        const existing = genreMap.get(genre.name);
        if (existing) {
            // Merge subgenres if genre already exists
            existing.sub_genres = Array.from(new Set([...existing.sub_genres, ...genre.sub_genres]));
        } else {
            genreMap.set(genre.name, genre);
        }
    }
    // Return the unique genres as an array
    return Array.from(genreMap.values());
}
