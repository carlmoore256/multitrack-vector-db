import { Calculator } from "langchain/tools/calculator";
import { SerpAPI } from "langchain/tools";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { DynamicTool } from "langchain/tools";
import { loadJSON, saveJSON } from "../utils/utils.js";
import { PromptTemplate } from "langchain/prompts";
import { queryAllFilenames, addNumberedPrefixes } from "./createInstruments.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { Debug } from "../utils/Debug.js";
import { LLMStreamCallbackHandler } from "./LLMStreamHandler.js";
// import { ModelCall}

import dotenv from "dotenv";
dotenv.config();

const template = `What are the most common instruments in {filenames}?`;

async function nameFiles(batchSize: number = 10) {

    const client = new DatabaseClient();
    await client.connect();
    let filenames = await queryAllFilenames(client);
    filenames = addNumberedPrefixes(filenames);
    filenames = filenames.slice(0, batchSize);

    const categories = loadJSON<Record<string, string[]>>("./data/instruments/gpt-4-categories.json");
    const categoryKeys = Object.keys(categories);
    
    const tools = [
        new DynamicTool({
            name: "QueryCategory",
            description: "Get the list of instruments contained within a category",
            func: async (input: string) => {
                if (!categories.hasOwnProperty(input)) {
                    return `There is no category named ${input}`;
                }
                const items = categories[input];
                return `The category ${input} contains the following instruments: ${items.join(", ")}`;
            }
        }),
    ];

    const cb = new LLMStreamCallbackHandler();

    const model = new ChatOpenAI({
        temperature: 0,
        modelName: "gpt-3.5-turbo",
        streaming: true,
        verbose: true,
        callbacks: [{
            handleLLMNewToken(token: string) {
                console.log("token", { token });
            }
        }],
    });

    const executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
        llm: model,
        tools,
        humanMessageTemplate: template,
    });

    console.log("YOOOOOOO")

    const result = await executor.call({
        filenames: filenames.join(", ")
    });


    console.log({ result });
}


// const formatted = await PromptTemplate.fromTemplate(template).format({
//     filenames: filenames.join(", "), categoryKeys, jsonExample
// })

nameFiles();
