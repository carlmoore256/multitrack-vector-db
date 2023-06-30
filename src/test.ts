// import test from "./embeddings/openAIEmbeddingTest";
// test();

// import test from "./database/tables.js";
// test();

// import test from "./tests/testForumScraper.js";
// test();

import { unzipMultitracks } from "./datastore/unzip.js";
import Database from "./database/DatabaseClient.js";
import { flattenDir } from "./utils/files.js";

const path = `E:/cambridge-mt-scraper/data/storage/7e95093d-690c-4d64-b06b-346a0958c3c4`;

flattenDir(path);

// const dbClient = new Database();

// dbClient.connect().then(async () => {
//     console.log("Connected to database");
    


// });


