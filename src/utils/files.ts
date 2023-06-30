import path from "path";
import { readdirSync, rmdirSync, renameSync } from "fs";

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