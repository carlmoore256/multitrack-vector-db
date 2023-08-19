import { DatabaseClient } from "../database/DatabaseClient.js";
import { OpenAIClient } from "../services/OpenAIClient.js";
import {
    ChatCompletionRequestMessage,
    CreateChatCompletionResponse,
} from "openai";
import { saveJSON, loadJSON, saveText } from "../utils/utils.js";
import { parse } from "path";
import http, { IncomingMessage } from "http";
import { Debug } from "../utils/Debug.js";
import {
    encode,
    encodeChat,
    decode,
    isWithinTokenLimit,
    encodeGenerator,
    decodeGenerator,
    decodeAsyncGenerator,
} from "gpt-tokenizer/model/gpt-3.5-turbo";
import { OpenAIChatCompletionsModel } from "../services/openai-models.js";
import { incrementingFolderName } from "../utils/files.js";
import { printStreamedResponse } from "../cli/utils.js";

// import { Configuration, Open } from "chromadb/dist/main/generated/configuration.js";
const SYSTEM_MESSAGE: ChatCompletionRequestMessage = {
    role: "system",
    content:
        "You are a helpful assistant knowledgeable on all things music. You are helping a user organize a list of filenames into categories.",
};

export function addNumberedPrefixes(messages: Array<string>) {
    return messages.map((m, i) => `${i + 1}: ${m}`);
}

function getModel(messages: Array<ChatCompletionRequestMessage>) {
    return isWithinTokenLimit(messages as any, 2048)
        ? "gpt-3.5-turbo"
        : "gpt-3.5-turbo-16k";
}


export async function queryAllFilenames(
    databaseClient: DatabaseClient
): Promise<Array<string>> {
    const query = `
    SELECT 
        DISTINCT SUBSTRING(datastore_file.name FROM '_(.*)') AS filename
    FROM 
        datastore_file
    JOIN 
        recording_file
    ON 
        datastore_file.id = recording_file.file_id;`;
    let queryRows = await databaseClient.queryRows(query);
    if (!queryRows) {
        throw new Error("Could not get filenames");
    }

    queryRows = queryRows.filter((n) => n.filename !== null);
    return queryRows.map((n) => n.filename);
}

function getMissingEntries(
    outputJSON: any,
    originalList: string[]
): { missing: string[]; valid: any } {
    // make sure the output JSON has the correct number of keys
    const keys = Object.keys(outputJSON);
    const allValues = [];

    for (const key of keys) {
        const values = outputJSON[key];
        outputJSON[key] = values.filter((v: string) =>
            originalList.includes(v)
        );
        allValues.push(...outputJSON[key]);
    }

    const allValuesSet = new Set(allValues);
    console.log(
        `Size of LLM output: ${allValuesSet.size} | Size of original: ${originalList.length}`
    );
    return {
        missing: originalList.filter((n) => !allValuesSet.has(n)),
        valid: outputJSON,
    };
}

function parseLLMOutput(output: CreateChatCompletionResponse) {
    const outputString = output.choices[0].message?.content;
    return JSON.parse(outputString as string);
}

// gets all unique filenames, removes any prefix, and tries
// to parse an instrument name from
export async function createInstrumentRelations(
    databaseClient: DatabaseClient,
    outputFilename: string
) {
    const distinctNames = await queryAllFilenames(databaseClient);

    const prompt = `Review the following list of filenames, and create a set of categories to group them by. 
    Once you have created that list, nest each filename under the category it belongs to, in JSON format. Format your responses as a JSON object, with each category as a key, and a list of filenames as the value.  
    Keep the categories fairly general, so for instance, instead of having a category for "kick drum", have a category for "drums".
    Make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`;

    const messages: ChatCompletionRequestMessage[] = [
        SYSTEM_MESSAGE,
        {
            role: "user",
            content: `${prompt} Here is the list of filenames: 
        
        ${addNumberedPrefixes(distinctNames)}
        
        Remember: make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`,
        },
    ];

    Debug.log(`[USING MODEL] ${getModel(messages)}`);

    const openAIClient = new OpenAIClient();

    let allText = "";
    let response = await openAIClient.streamChatCompletion(
        messages,
        getModel(messages),
        (chunk) => {
            allText += chunk.content;
            printStreamedResponse(allText);
        }
    );

    console.log("[FINAL RESPONSE]\n", response);

    try {
        let categorizedInstruments = JSON.parse(response);
        // save it in case it fails to output proper JSON
        saveJSON(categorizedInstruments, outputFilename);

        let { missing, valid } = getMissingEntries(
            categorizedInstruments,
            distinctNames
        );

        while (missing.length > 0) {
            Debug.log(`Attempting to fix ${missing.length} missing entries`);

            const newMessages: ChatCompletionRequestMessage[] = [
                SYSTEM_MESSAGE,
                {
                    role: "user",
                    content: `${prompt} Here is the list of filenames: 
                
                ${addNumberedPrefixes(missing)}   
                
                Remember: make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`,
                },
            ];
            Debug.log(`[USING MODEL] ${getModel(newMessages)}`);
            response = await openAIClient.streamChatCompletion(
                newMessages,
                getModel(newMessages),
                (chunk) => {
                    allText += chunk.content;
                    printStreamedResponse(allText);
                }
            );

            const filtered = getMissingEntries(
                JSON.parse(response),
                distinctNames
            );
            missing = filtered.missing;
            categorizedInstruments = filtered.valid;

            const existing = loadJSON<any>(outputFilename);

            for (const key of Object.keys(categorizedInstruments)) {
                if (existing[key]) {
                    existing[key] = [
                        ...existing[key],
                        ...categorizedInstruments[key],
                    ];
                } else {
                    existing[key] = categorizedInstruments[key];
                }
            }

            saveJSON(existing, outputFilename);
        }

        // saveJSON(JSON.parse(response), "data/instruments/instrument-filenames-parsed.json")
    } catch (e) {
        Debug.error(e);
        const textFilename = outputFilename.split(".")[0] + ".txt";
        saveText(response, outputFilename.split(".")[0] + ".txt");
        console.log(`Saved parsed instruments to ${textFilename}`);
    }
}

async function createCategories(databaseClient: DatabaseClient) {
    const distinctNames = await queryAllFilenames(databaseClient);

    const prompt = `Review the following list of filenames, and create a set of instrument names to group them by.
    Take the entire set of filenames into account when creating your set of names. Instrument names should not be specific, like "LeadVox", "Vox1", or "vox2", but MUST BE GENERAL, like "Vocals".
    For example, "Elec Guitar" and "Electric Guitar" should be grouped together as "Electric Guitar". "Wurlitzer" and "Hammond" should be grouped together as "Organ". 
    Restrain yourself to 20-30 categories. Avoid category overlap, such as "Hi-Hat" and "Drums" - in that case, "Hi-Hat" should be nested under "Drums".
    Format your response as a valid JSON list. Do NOT include any other text in your response. Remember, make the categories broad, keep them to instrument type, or general category. Do NOT include specific instrument names. 
    Here is a condensed example: 
    ["Bass",
    "Drums",
    "Guitar",
    "Keyboards",
    "Percussion",
    "Synth",
    "Vocals",
    "Strings",
    "Brass",
    "Woodwinds",
    "Effects",
    "Mallets",
    "Choir",
    "World",
    "Ambience",
    "Samples",
    "Piano",
    "Organ",
    "Accompaniment"]
    `;

    const newMessages: ChatCompletionRequestMessage[] = [
        SYSTEM_MESSAGE,
        {
            role: "user",
            content: `${prompt} Here is the list of filenames: 
        
        ${addNumberedPrefixes(distinctNames)}   
        
        Remember: make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`,
        },
    ];

    let allText = "";
    const response = await new OpenAIClient().streamChatCompletion(
        newMessages,
        getModel(newMessages),
        (chunk) => {
            allText += chunk.content;
            printStreamedResponse(allText);
        }
    );

    try {
        const json = JSON.parse(response);
        saveJSON(json, "data/instruments/instrument-names.json");
    } catch (e) {
        Debug.error(e);
        saveText(response, "data/instruments/instrument-names.txt");
    }
}

function validateLabeledFilenames(
    labeled: any[],
    original: string[],
    categories: any
) {
    const originalSet = new Set(original);
    const invalid = labeled.filter((n) => {
        return (
            !n.filename ||
            !originalSet.has(n.filename) ||
            !n.instrument ||
            !n.category ||
            !categories[n.category] ||
            !categories[n.category].includes(n.instrument)
        );
    });

    // const valid = labeled.filter(n => !invalid.includes(n));

    const valid = labeled.filter((n) => {
        return (
            n.filename &&
            originalSet.has(n.filename) &&
            n.instrument &&
            n.category &&
            categories[n.category] &&
            categories[n.category].includes(n.instrument)
        );
    });

    if (invalid.length == 0) return { valid, invalid, missing: [] };

    const missing = invalid.map((n) => n.filename);

    return { valid, invalid, missing };
}

async function runLabelFilesBatch(
    filenames: string[],
    categories: any,
    prompt: string
) {
    const userMessage = `${prompt} Here is the list of filenames I want you to to categorize: 
    <filenames>
    ${addNumberedPrefixes(filenames)}
    </filenames>

    Remember the following rules:
    - Make sure to include EVERY single file.
    - You MUST include a category AND instrument for EVERY file.
    - Do NOT repeat filenames. 
    - Include the index, to make sure you count through all of them.
    - Return ONLY a valid JSON formatted message. 
    - Do NOT include any other text in your response.
    - DO NOT INCLUDE ANY OTHER TEXT IN YOUR RESPONSE! This includes saying "Sure, I'll do that", or "I'm ready to start", or "I'm done", or "I'm finished", or "I'm done with this batch", or "I'm done with this task". ONLY include the JSON formatted message.`;

    const messages: ChatCompletionRequestMessage[] = [
        SYSTEM_MESSAGE,
        { role: "user", content: userMessage },
    ];

    Debug.log(`[USING MODEL] ${getModel(messages)}`);

    const openAIClient = new OpenAIClient();
    Debug.log(`[USING MODEL] ${getModel(messages)}`);

    let allText = "";
    let response = await openAIClient.streamChatCompletion(
        messages,
        getModel(messages),
        (chunk) => {
            allText += chunk.content;
            printStreamedResponse(allText);
        }
    );

    return response;
}

async function labelFilesWithCategories(
    databaseClient: DatabaseClient,
    categories: any,
    batchSize: number = 100,
    outputBase = "data/instruments/categorized",
    restoreRun?: string
) {
    let distinctNames = await queryAllFilenames(databaseClient);

    const prompt = `I want you to label each of the following list of <filenames> with the instrument name and category it belongs to.
    These <filenames> are the names of tracks in a multitrack recording, and I want you to infer what instrument each track is, and what category it belongs to.

    I will provide you with a JSON denoted by <categories>, containing the category name, with a list of instrument names in that category.
    When labeling the filename from <filenames>, please find the matching instrument name, as well as the category it belongs to from <categories>.
    Return to me a list of objects containing the filename, instrument name, category name, and index of the file. Here is an example of what you should return:

    [
        {category: "Drums", instrument: "Kick", filename: "Kick_01.wav", index: 1},
        {category: "Vocals", instrument: "Choir", filename: "ChoirAG.wav", index: 2},
        {category: "Guitar", instrument: "Banjo", filename: "Banjo_440L.wav", index: 3},
    ]

    Notice that the filenames might contain information about the recording, such as the key, or the microphone used, or any other information.
    Use your best judgement to determine what the instrument name is, and what category it belongs to.

    Here is the list of <categories> I want you to reference:

    <categories>
    ${JSON.stringify(categories, null, 2)}
    </categories>

    Make sure to include EVERY single file. Do NOT make up categories or new instrument names, use only what is given to you in <categories>.
    Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`;

    const outputDir = incrementingFolderName(outputBase, "run_");
    console.log(`[RESULT DIR] ${outputDir}`);

    const categorizedFilename = `${outputDir}/categorized.json`;
    const missingFilename = `${outputDir}/missing.json`;

    saveJSON([], categorizedFilename);
    saveJSON([], missingFilename);

    if (restoreRun) {
        const restoredCategorized = loadJSON<any>(
            `${outputBase}/${restoreRun}/categorized.json`
        );
        const restoredMissing = loadJSON<any>(
            `${outputBase}/${restoreRun}/missing.json`
        );
        saveJSON(restoredCategorized, categorizedFilename);
        saveJSON(restoredMissing, missingFilename);
        distinctNames = distinctNames.filter(
            (n) => !restoredCategorized.map((n: any) => n.filename).includes(n)
        );
    }

    function appendValid(valid: any[]) {
        const currentData = loadJSON<any>(categorizedFilename);
        saveJSON([...currentData, ...valid], categorizedFilename);
        console.log(`Saved ${valid.length} entries to ${categorizedFilename}`);
    }

    function appendMissing(missing: string[]) {
        const currentMissing = loadJSON<any>(missingFilename);
        saveJSON([...currentMissing, ...missing], missingFilename);
        console.log(
            `Saved ${currentMissing.length} entries to ${missingFilename}`
        );
    }

    for (let i = 0; i < distinctNames.length; i += batchSize) {
        Debug.log(
            `Batch ${i / batchSize + 1} of ${Math.ceil(
                distinctNames.length / batchSize
            )}`
        );
        const filenames = distinctNames.slice(i, i + batchSize);
        const response = await runLabelFilesBatch(
            filenames,
            categories,
            prompt
        );
        console.log("[FINAL RESPONSE]\n", response);
        try {
            let newCategorized = JSON.parse(response);
            const { valid, invalid, missing } = validateLabeledFilenames(
                newCategorized,
                filenames,
                categories
            );
            appendValid(valid);
            appendMissing(missing);
        } catch (e) {
            appendMissing(filenames);
        }
    }
}

async function run() {
    const client = new DatabaseClient();
    await client.connect();
    const categories = loadJSON<any>("data/instruments/gpt-4-categories.json");
    labelFilesWithCategories(client, categories, 10);
}

// let distinctNames = await queryAllFilenames(client);
// const categorized = loadJSON<any>("data/instruments/categorized/run_1/categorized.json");
// const missing = loadJSON<any>("data/instruments/categorized/run_1/missing.json");

// console.log(`Categorized: ${categorized.length} | Distinct: ${distinctNames.length} | Missing: ${missing.length}`);

// const validCategorized = categorized.filter((n : any) => distinctNames.includes(n.filename))
// console.log(`Valid categorized: ${validCategorized.length}`);
