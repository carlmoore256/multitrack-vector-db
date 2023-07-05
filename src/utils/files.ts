import path from "path";
import { readdirSync, rmdirSync, renameSync, existsSync, mkdirSync, chmodSync, statSync } from "fs";
import mime from "mime";

export function flattenDir(rootDir: string, originalDir?: string)  {
    const files = readdirSync(rootDir, { withFileTypes: true });
    if (files.length === 0) {
        return [];
    }
    for(const f of files) {
        const res = path.resolve(rootDir, f.name);
        if (f.isDirectory()) {
            flattenDir(res, originalDir || rootDir); // Recursively call flattenDir for directories            
            if (readdirSync(res).length === 0) {
                rmdirSync(res); // Delete empty directories
            }
        } else {
            const dest = path.resolve(originalDir || rootDir, f.name);
            if (res !== dest) {
                renameSync(res, dest); // Move files to rootDir
            }
        }
    }
}

export function getAllFilesInDir(dir: string): string[] {
    let results: string[] = [];
    const list = readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = statSync(filePath);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(getAllFilesInDir(filePath));
        } else {
            /* Is a file */
            results.push(filePath);
        }
    });

    return results;
}

export function checkMakeDir(dir: string) {
    if (!existsSync(dir)) {
        mkdirSync(dir);
    }
}

export function getMimeType(filename: string) {
    return mime.getType(filename);
}

export function modifyFilePermissions(filePath : string, permissions : any = 0o644) {
    const res = chmodSync(filePath, permissions);
}