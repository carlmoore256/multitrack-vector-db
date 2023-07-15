import dotenv from 'dotenv';
dotenv.config();

export const STORAGE_ROOT = process.env.STORAGE_ROOT || "data/storage";
export const DOWNLOAD_TEMP_DIR = process.env.DOWNLOAD_TEMP_DIR || "data/downloads";