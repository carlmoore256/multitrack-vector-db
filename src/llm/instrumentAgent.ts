import { Calculator } from "langchain/tools/calculator";
import { SerpAPI } from "langchain/tools";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { DynamicTool } from "langchain/tools";
import { loadJSON, saveJSON } from "../utils/utils.js";
import { PromptTemplate } from "langchain/prompts";
import { queryAllFilenames, addNumberedPrefixes } from "./createInstruments.js";
import { DatabaseClient } from "../database/DatabaseClient.js";
import { Debug } from "../utils/debug.js";
import { LLMStreamCallbackHandler } from "./LLMStreamHandler.js";
// import { ModelCall}

import dotenv from "dotenv";
dotenv.config();

const jsonExample = `[
    { "category": "Vocals", "instrument": "Background Vocals","filename": "BackingVox6DT.wav" },
    { "category": "Guitar", "instrument": "Electric Guitar", "filename": "Gtr4Solo.wav" },
    { "category": "Vocals", "instrument": "Background Vocals", "filename": "BackingVoxHi03.wav" },
    { "category": "Woodwinds", "instrument": "Saxophone", "filename": "SaxophoneCloseMic2.wav" },
    { "category": "Samples", "instrument": "Loops", "filename": "Loop4.wav" },
]`

const template = `I want you to label each of the following list of <filenames> with the instrument name and category it belongs to.
These <filenames> are the names of tracks in a multitrack recording, and I want you to infer what instrument each track is, and what category it belongs to.

I will provide you with a list of <categories> that encompasses all the categories I want you to consider. 
If you need examples of instruments in a category, call the tool <QueryCategory> with the category name as the input, and it will return a list of instruments in that category. 
When labeling the filename from <filenames>, please find the matching instrument name, as well as the category it belongs to from <categories>.
Return to me a list of objects containing the filename, instrument name, and category name. Here is an example <schema> of what you should return:

{jsonExample}

Notice that the filenames might contain information about the recording, such as the key, or the microphone used, or any other information.
Use your best judgement to determine what the instrument name is, and what category it belongs to.

Here is the list of <categories> I want you to reference:

{categoryKeys}

Make sure to include EVERY single file.
Do NOT make up categories or new instrument names, use only what is given to you in <categories>.
Return ONLY a valid JSON formatted message that is an array, in the <schema> that I showed you. 

Do NOT include any other text in your response.

Here is the list of <filenames> I want you to to categorize: 

{filenames}`;

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
            },
            tags: ["alias_QueryCategory"],
        }),
    ];

    const model = new ChatOpenAI({
        temperature: 0,
        modelName: "gpt-3.5-turbo",
        streaming: true,
        verbose: false,
        callbacks: [new LLMStreamCallbackHandler()],
    });

    const executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
        llm: model,
        tools,
        humanMessageTemplate: template,
    });

    const result = await executor.call({
        filenames: filenames.join(", "), categoryKeys, jsonExample
    });


    console.log({ result });
}


// const formatted = await PromptTemplate.fromTemplate(template).format({
//     filenames: filenames.join(", "), categoryKeys, jsonExample
// })

nameFiles();
