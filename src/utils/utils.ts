import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { v4 as uuidv4 } from 'uuid';
import { createHash } from "crypto";
import path from "path";
import { Debug } from "./Debug.js";
import axios from 'axios';

const CACHE_DIR = "./data/cache/";

export async function checkLoadCache<T>(
        url : string, cacheId : string, 
        extension : string="html", 
        encoding : BufferEncoding="utf8",
        verbose : boolean = false) : Promise<T> {
    
    var data = null;
    const filename = path.join(CACHE_DIR, cacheId + `.${extension}`);

    if (existsSync(filename)) {
        Debug.log(`Loading ${filename} from cache...`);
        data = readFileSync(filename, encoding);
    } else {
        Debug.log("Fetching from web...");
        const res = await axios.get(url);
        data = await res.data;
        if (!existsSync(CACHE_DIR)) {
            Debug.log("Creating cache directory...");
            mkdirSync(CACHE_DIR);
        }
        Debug.log("Writing to cache...");
        writeFileSync(filename, data);
    }
    if (data == null) {
        throw new Error("Failed to fetch data");
    }
    return data as T;
}

export function queryElement<T extends HTMLElement>(element: HTMLElement, query: string) : T {
    const el = element.querySelector(query);
    if (!el) {
        throw new Error(`Could not find element with query ${query}`);
    }
    return el as T;
}


// Helper function to extract text content from an element
export function getTextContent(element: HTMLElement | Element, selector: string): string | null {
    const child = element.querySelector(selector);
    return child?.textContent?.trim() || null;
  }
  
export function getAttributeValue(element: HTMLElement | Element, selector: string, attribute: string): string | null {
    const child = element.querySelector(selector);
    return child?.getAttribute(attribute) || null;
}

// Helper function to parse number from a string
export function parseNumberFromString(value: string): number {
    return parseInt(value, 10);
}

export function saveJSON(data : any, outputFilename : string) {
    const json = JSON.stringify(data, null, 2);
    writeFileSync(outputFilename, json);
}

export function loadJSON<T>(filename : string) : T {
    const data = readFileSync(filename, 'utf8');
    return JSON.parse(data) as T;
}

export function getIdFromName(name : string) : string {
    // return name.toLowerCase().replace(/ /g, "-");
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

export function generateId() {
    return uuidv4();
}

export function generateHashId(input : string, length : number, algorithm = 'sha256') {
    const hash = createHash(algorithm).update(input).digest('hex');
    return hash.substring(0, length);
}

export function convertUrlToFileName(url : string) {
    // Remove protocol and special characters from the URL
    const sanitizedUrl = url.replace(/https?:\/\//g, '').replace(/[^\w\d.]/g, '_');
    // Limit the file name length to 255 characters
    const fileName = sanitizedUrl.substring(0, 255); 
    return fileName;
}
