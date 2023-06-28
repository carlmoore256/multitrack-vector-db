// import test from "./embeddings/openAIEmbeddingTest";
// test();

// import test from "./database/tables.js";
// test();

// import test from "./tests/testForumScraper.js";
// test();

import dbClient from "./database/dbClient.js";
const test = new dbClient();

test.connect().then(async () => {
    console.log("Connected to database");
    // const genres = await test.getAllGenres();
    // console.log(genres);
    // const artists = await test.getAllArtists();

    // console.log(artists);
    // const recordings = await test.getAllRecordings();
    // console.log(recordings);
    // await test.disconnect();
    // console.log("Disconnected from database");
});