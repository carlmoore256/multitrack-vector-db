import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";
import dotenv from "dotenv";
dotenv.config();

const embedder = new OpenAIEmbeddingFunction({openai_api_key: process.env.OPENAI_API_KEY as string});


async function main() {
    const client = new ChromaClient();
    const collection = await client.createCollection({name: "testCollection", embeddingFunction: embedder})
    
    
    // const collection = await client.getCollection({name: "testCollection", embeddingFunction: embedder})
    
    // const embeddings = embedder.generate(["document1","document2"])
    
    console.log("COLLECTION", collection);
    
    // pass documents to query for .add and .query
    // const collection = await client.getCollection({name: "name", embeddingFunction: embedder})
    
}

export default main;





const CHROMA_DB_URL = process.env.CHROMA_DB_URL as string;