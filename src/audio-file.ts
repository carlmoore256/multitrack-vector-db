import { IAudioFile } from "./models/audio-models.js";
import { IMultitrackRecording } from "./models/cambridge-models.js";
import { IRecordingFileEntity } from "./models/entity-models.js";
import { DatabaseClient } from "./database/DatabaseClient.js";
import mime from 'mime';
import { Debug } from "./utils/Debug.js";
import { generateHashId } from "./utils/utils.js";
import { statSync } from "fs";
import path from "path";

export const SUPPORTED_FILE_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/x-mpeg',
    'audio/x-mp3',
    'audio/x-mp4',
    'audio/x-m4a',
    'audio/x-wav',
    'audio/wav',
    'audio/x-aiff',
    'audio/aiff',
    'audio/x-aifc',
    'audio/aifc',
    'audio/x-caf',
    'audio/x-flac',
    'audio/flac',
    'audio/x-matroska',
    'audio/x-musepack',
    'audio/x-opus+ogg',
    'audio/ogg',
    'audio/x-ogg',
    'audio/x-speex+ogg',
    'audio/x-vorbis+ogg',
    'audio/x-vorbis',
];

export function isSupportedFileType(type: string) : boolean {
    const mimeType = mime.getType(type);
    if (!mimeType) {
        return false;
    }
    if (mimeType.includes('audio')) {
        return true;
    }
    return SUPPORTED_FILE_TYPES.includes(mimeType);
}

export function getAudioFileInfo(filepath: string, id? : string) : IAudioFile | null {
    if (!isSupportedFileType(filepath)) {
        Debug.logError(`File type ${filepath} is not supported`);
        return null;
    }
    const stats = statSync(filepath);

    if (!id) {
        id = generateHashId(filepath, 8);
    }

    return {
        id,
        uri: filepath,
        name: path.basename(filepath),
        bytes: stats.size,
    };
}

export async function addAudioFileToDatabase(dbClient : DatabaseClient, audioFile: IAudioFile, recording? : IMultitrackRecording) : Promise<boolean> {

    if (!await dbClient.insert('audio_file', audioFile)) {
        return false;
    }
    
    if (!recording) {
        return true;
    }

    const recordingFile : IRecordingFileEntity = {
        recording_id: recording.id,
        file_id: audioFile.id,
    };

    return await dbClient.insert('recording_file', recordingFile);
}