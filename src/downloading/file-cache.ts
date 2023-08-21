import { Debug } from "../utils/Debug.js";
import { convertUrlToFileName } from "../utils/utils.js";
import axios from "axios";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const FILE_CACHE_DIR = process.env.CACHE_DIR || "./data/cache";

export async function checkLoadFileCache<T>(
    url: string,
    cacheId: string,
    extension: string = "html",
    encoding: BufferEncoding = "utf8",
    verbose: boolean = false
): Promise<T> {
    var data = null;
    const filename = path.join(FILE_CACHE_DIR, cacheId + `.${extension}`);

    if (existsSync(filename)) {
        Debug.log(`Loading ${filename} from cache...`);
        data = readFileSync(filename, encoding);
    } else {
        Debug.log("Fetching from web...");
        const res = await axios.get(url);
        data = await res.data;
        if (!existsSync(FILE_CACHE_DIR)) {
            Debug.log("Creating cache directory...");
            mkdirSync(FILE_CACHE_DIR);
        }
        Debug.log("Writing to cache...");
        writeFileSync(filename, data);
    }
    if (data == null) {
        throw new Error("Failed to fetch data");
    }
    return data as T;
}

export function loadFileFromCache(
    url: string,
    extension: string = "html",
): Buffer {
    const cacheId = convertUrlToFileName(url);
    const filename = path.join(FILE_CACHE_DIR, cacheId + "." + extension);
    const data = readFileSync(filename, );
    if (data == null) {
        throw new Error("Failed to fetch data");
    }
    return data;
}
