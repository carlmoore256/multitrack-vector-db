import { IMultitrackRecording } from "./models/cambridge-models.js";
import DatabaseClient from "./database/dbClient.js";

const RECORDINGS_ROOT = "data/multitrack_recordings/";

// handles the state of the download of multitrack recoding files
export class MultitrackDownloader {

    private dbClient: DatabaseClient = new DatabaseClient();

    constructor() {

    }

    public async downloadMultitrackRecording(multitrackRecording: IMultitrackRecording) {
        console.log(multitrackRecording);
    }

}