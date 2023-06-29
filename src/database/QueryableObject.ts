import { IMultitrackRecordingEntity } from "../models/entity-models.js";




export abstract class QueryableObject<T> {

    abstract tableName : string;
    
    abstract data : T;

    setData(data : T) {
        this.data = data;
    }

    abstract createQuery() : string;


}

class MutlitrackQueryable extends QueryableObject<IMultitrackRecordingEntity> {
    
    tableName = "multitrack_recording";

    data : IMultitrackRecordingEntity = {
        id: "foo",
        name: "bar",
        numTracks: 1,
        artistId: "baz",
        metadata: "qux"
    }

    createQuery(): string {
        return `INSERT INTO ${this.tableName} VALUES (${this.data.id}, ${this.data.name}, ${this.data.numTracks}, ${this.data.artistId}, ${this.data.metadata})`;
    }

    // static

}


const test = new MutlitrackQueryable();