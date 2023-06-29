

export interface IAudioFile {
    id : string;
    uri : string;
    name : string;
    tags? : string[];
    bytes? : number;
    metadata? : any;
}

export type AudioClassifierModel = 'BEATs' | 'YAMNet';

// representation of a point in time in any arbitrary waveform audio file
export interface IAudioWindow {
    id : string;
    fileId : string; // fk IMultitrackFile.id
    
    // query sample range/length
    sampleStart : number;
    sampleEnd : number;
    sampleLength : number;
    
    // query time range/length
    timeStart : number;
    timeEnd : number;
    timeLength : number;

    // query time normalized to 0-1 for range/length
    normalizedTimeStart : number;
    normalizedTimeEnd : number; // this way we can query before a start and end time
    normalizedTimeLength : number;

    clipIndex? : number;
}


// a vector index for direct audio embeddings
export interface IAudioEmbedding {
    windowId : string; // fk IAudioWindow.id
    vector : number[]; // vector index
}


// a vector index to be used with an audio classifier like BEATs or Yamnet
export interface IAudioLabel {
    windowId : string; // fk IAudioWindow.id
    label : string;
    model : AudioClassifierModel | string;
    vector? : number[]; // vector index (of label embeddings)
    probability? : number;
    class? : string;
}

// a vector index for mel cepstral coefficients
export interface IAudioMel {
    windowId : string; // fk IAudioWindow.id
    vector : number[]; // vector index
}