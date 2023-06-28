import pg from 'pg';
import { IGenre, IArtist, IMultitrackFile, IMultitrackRecording } from '../types.js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

export class DatabaseClient {
    private db: pg.Client;

    constructor() {
        this.db = new Client({
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
        });
    }

    public async connect() {
        await this.db.connect();
        const initTables = readFileSync('../sql/create_tables.sql', 'utf-8');
        this.db.query(initTables);
        console.log("Initialized tables");
    }

    public async disconnect() {
        await this.db.end();
    }



    public async createGenre(genre: IGenre): Promise<void> {
        await this.db.query('INSERT INTO genre (id, name, subGenres) VALUES ($1, $2, $3)', [genre.id, genre.name, genre.subGenres]);
    }        

    public async getGenreById(id: string) {
        const res = await this.db.query('SELECT * FROM genre WHERE id = $1', [id]);
        return res.rows[0];
    }

    public async getAllGenres() {
        const res = await this.db.query('SELECT * FROM genre');
        return res.rows;
    }



    public async createArtist(artist : IArtist) {
        await this.db.query('INSERT INTO artist (id, name, description) VALUES ($1, $2, $3)', [artist.id, artist.name, artist.description]);
    }

    public async getArtistById(id: string) {
        const res = await this.db.query('SELECT * FROM artist WHERE id = $1', [id]);
        return res.rows[0];
    }

    // Add similar methods for the other tables...
    // For example:
    public async getAllArtists() {
        const res = await this.db.query('SELECT * FROM artist');
        return res.rows;
    }
}

export default DatabaseClient;
