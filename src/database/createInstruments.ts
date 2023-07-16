import { DatabaseClient } from "./DatabaseClient.js";
import { OpenAIClient } from "../services/OpenAIClient.js";
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai";
import { saveJSON, loadJSON, saveText } from "../utils/utils.js";
import { parse } from "path";
import http, { IncomingMessage } from 'http';
import { Debug } from "../utils/Debug.js";
import {
    encode,
    encodeChat,
    decode,
    isWithinTokenLimit,
    encodeGenerator,
    decodeGenerator,
    decodeAsyncGenerator
} from 'gpt-tokenizer/model/gpt-3.5-turbo'
import { OpenAIChatCompletionsModel } from "../services/openai-models.js";
import logUpdate from "log-update";


// import { Configuration, Open } from "chromadb/dist/main/generated/configuration.js";
const SYSTEM_MESSAGE: ChatCompletionRequestMessage = { role: 'system', content: 'You are a helpful assistant knowledgeable on all things music. You are helping a user organize a list of filenames into categories.' };

function addNumberedPrefixes(messages: Array<string>) {
    return messages.map((m, i) => `${i + 1}: ${m}`);
}

function getModel(messages: Array<ChatCompletionRequestMessage>) {
    return isWithinTokenLimit(messages as any, 2048) ? "gpt-3.5-turbo" : "gpt-3.5-turbo-16k";
}

function printStreamedResponse(allText: string) {
    logUpdate(`${allText}`);
}

async function queryAllFilenames(databaseClient: DatabaseClient): Promise<Array<string>> {

    const query = `
    SELECT 
        DISTINCT SUBSTRING(datastore_file.name FROM '_(.*)') AS filename
    FROM 
        datastore_file
    JOIN 
        recording_file
    ON 
        datastore_file.id = recording_file.file_id;`
    let queryRows = await databaseClient.queryRows(query);
    if (!queryRows) {
        throw new Error("Could not get filenames");
    }

    queryRows = queryRows.filter(n => n.filename !== null);
    return queryRows.map(n => n.filename);
}

function getMissingEntries(outputJSON: any, originalList: string[]): { missing: string[], valid: any } {
    // make sure the output JSON has the correct number of keys
    const keys = Object.keys(outputJSON);
    const allValues = [];

    for (const key of keys) {
        const values = outputJSON[key];
        outputJSON[key] = values.filter((v: string) => originalList.includes(v));
        allValues.push(...outputJSON[key]);
    }

    const allValuesSet = new Set(allValues);
    console.log(`Size of LLM output: ${allValuesSet.size} | Size of original: ${originalList.length}`);
    return {
        missing: originalList.filter(n => !allValuesSet.has(n)),
        valid: outputJSON
    }
}

function parseLLMOutput(output: CreateChatCompletionResponse) {
    const outputString = output.choices[0].message?.content;
    return JSON.parse(outputString as string);
}


// gets all unique filenames, removes any prefix, and tries
// to parse an instrument name from
export async function createInstrumentRelations(databaseClient: DatabaseClient, outputFilename: string) {
    const distinctNames = await queryAllFilenames(databaseClient);

    const prompt = `Review the following list of filenames, and create a set of categories to group them by. 
    Once you have created that list, nest each filename under the category it belongs to, in JSON format. Format your responses as a JSON object, with each category as a key, and a list of filenames as the value.  
    Keep the categories fairly general, so for instance, instead of having a category for "kick drum", have a category for "drums".
    Make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`

    const messages: ChatCompletionRequestMessage[] = [
        SYSTEM_MESSAGE,
        {
            role: 'user', content: `${prompt} Here is the list of filenames: 
        
        ${addNumberedPrefixes(distinctNames)}
        
        Remember: make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`},
    ]

    Debug.log(`[USING MODEL] ${getModel(messages)}`)

    const openAIClient = new OpenAIClient();

    let allText = "";
    let response = await openAIClient.streamChatCompletion(messages, getModel(messages), (chunk) => {
        allText += chunk.content;
        printStreamedResponse(allText);
    });

    console.log("[FINAL RESPONSE]\n", response);

    try {
        let categorizedInstruments = JSON.parse(response);
        // save it in case it fails to output proper JSON
        saveJSON(categorizedInstruments, outputFilename)

        let { missing, valid } = getMissingEntries(categorizedInstruments, distinctNames);

        while (missing.length > 0) {
            Debug.log(`Attempting to fix ${missing.length} missing entries`);

            const newMessages: ChatCompletionRequestMessage[] = [
                SYSTEM_MESSAGE,
                {
                    role: 'user', content: `${prompt} Here is the list of filenames: 
                
                ${addNumberedPrefixes(missing)}   
                
                Remember: make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`},
            ]
            Debug.log(`[USING MODEL] ${getModel(newMessages)}`)
            response = await openAIClient.streamChatCompletion(newMessages, getModel(newMessages), (chunk) => {
                allText += chunk.content;
                printStreamedResponse(allText);
            });

            const filtered = getMissingEntries(JSON.parse(response), distinctNames);
            missing = filtered.missing;
            categorizedInstruments = filtered.valid;

            const existing = loadJSON<any>(outputFilename);


            for (const key of Object.keys(categorizedInstruments)) {
                if (existing[key]) {
                    existing[key] = [...existing[key], ...categorizedInstruments[key]];
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
    `

    const newMessages: ChatCompletionRequestMessage[] = [
        SYSTEM_MESSAGE,
        {
            role: 'user', content: `${prompt} Here is the list of filenames: 
        
        ${addNumberedPrefixes(distinctNames)}   
        
        Remember: make sure to include EVERY single file. Return ONLY a valid JSON formatted message. Do NOT include any other text in your response.`},
    ]

    let allText = "";
    const response = await new OpenAIClient().streamChatCompletion(newMessages, getModel(newMessages), (chunk) => {
        allText += chunk.content;
        printStreamedResponse(allText);
    });

    try {
        const json = JSON.parse(response);
        saveJSON(json, "data/instruments/instrument-names.json");
    } catch (e) {
        Debug.error(e);
        saveText(response, "data/instruments/instrument-names.txt");
    }

}


const client = new DatabaseClient();
await client.connect();
// createInstrumentRelations(client, "data/instruments/instrument-filenames-categories.json");
await createCategories(client);