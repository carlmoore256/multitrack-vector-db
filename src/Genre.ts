import { IGenre } from "./types.js";


export class CambridgeMTGenre implements IGenre {

    constructor(
        public id: string, 
        public name: string, 
        public subGenres: string[]
    ) {}


    /**
     * Creates a genre from a page HTMLElement
     * @param {HTMLElement} element the page element that contains the genre
     */
    static fromElement(element: HTMLElement) : CambridgeMTGenre {
        const name = element.querySelector("h3")?.id as string;
        const id = name.toLowerCase();
        const subGenres = element.querySelector("h3 span")?.textContent?.split(" / ");
        
        if (!id || !name || !subGenres) {
            throw new Error("Could not parse genre");
        }
        return new CambridgeMTGenre(id, name, subGenres);
    }
}

export function consolidateGenres(genres: CambridgeMTGenre[]): CambridgeMTGenre[] {
    const genreMap = new Map<string, CambridgeMTGenre>();

    for (const genre of genres) {
        const existing = genreMap.get(genre.name);
        if (existing) {
            // Merge subgenres if genre already exists
            existing.subGenres = Array.from(new Set([...existing.subGenres, ...genre.subGenres]));
        } else {
            genreMap.set(genre.name, genre);
        }
    }
    // Return the unique genres as an array
    return Array.from(genreMap.values());
}
