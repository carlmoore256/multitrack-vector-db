import { IGenre } from "../models/cambridge-models.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { IDatabaseWriteable } from "../database/IDatabaseObject.js";
import { Debug, LogColor } from "../utils/debug.js";
import { Genre, PrismaClient } from "@prisma/client";

export class CambridgeMTGenre implements IDatabaseWriteable<Genre> {
  public id: string;
  public subGenres: string[];

  constructor(public name: string, subGenres: string[]) {
    this.id = name.toLowerCase();
    this.subGenres = Array.from(new Set(subGenres));
    this.subGenres = this.subGenres.filter((s) => s !== name);
  }

  /**
   * Creates a genre from a page HTMLElement
   * @param {HTMLElement} element the page element that contains the genre
   */
  static fromElement(element: HTMLElement): CambridgeMTGenre {
    const name = element.querySelector("h3")?.id as string;
    const subGenres = element
      .querySelector("h3 span")
      ?.textContent?.split(" / ");

    if (!name || !subGenres) {
      throw new Error("Could not parse genre");
    }
    return new CambridgeMTGenre(name, subGenres);
  }

  async insertIntoDatabase(client: PrismaClient): Promise<Genre | null> {
    const genre = await client.genre.upsert({
      where: {
        name: this.name,
      },
      update: {},
      create: {
        name: this.name,
        subGenres: this.subGenres,
      },
    })

    return genre;
  }
}

export function consolidateGenres(
  genres: CambridgeMTGenre[]
): CambridgeMTGenre[] {
  const genreMap = new Map<string, CambridgeMTGenre>();

  for (const genre of genres) {
    const existing = genreMap.get(genre.name);
    if (existing) {
      // Merge subgenres if genre already exists
      existing.subGenres = Array.from(
        new Set([...existing.subGenres, ...genre.subGenres])
      );
    } else {
      genreMap.set(genre.name, genre);
    }
  }
  // Return the unique genres as an array
  return Array.from(genreMap.values());
}
