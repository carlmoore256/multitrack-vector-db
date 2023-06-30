import { IAudioFile } from "../models/audio-models.js";
import { IMultitrackRecording } from "../models/cambridge-models.js";

// maybe?
export interface IAudioDownload {
    getAudioFile : () => IAudioFile;
}

// ?
interface IDatastoreFile {
    insertIntoDatabase : () => Promise<void>;
}

class MultitrackZip {

    constructor(
        public recording : IMultitrackRecording,
        public zipPath : string,
    ) {}

}