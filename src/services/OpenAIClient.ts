import {
    Configuration,
    OpenAIApi,
    Model,
    ChatCompletionRequestMessage,
    ChatCompletionFunctions,
    CreateChatCompletionRequestFunctionCall,
    CreateChatCompletionRequest,
    CreateChatCompletionResponse,
    CreateCompletionRequest,
    CreateCompletionRequestPrompt,
    CreateCompletionResponse,
    CreateEmbeddingRequestInput,
    CreateEmbeddingResponse
} from "openai";
import {
    OpenAIChatCompletionsModel,
    OpenAICompletionsModelLegacy,
    OpenAITranscriptionModel,
    OpenAITranslationModel,
    OpenAIEmbeddingsModel
} from "./openai-models.js";
import http, { IncomingMessage } from 'http';

import dotenv from "dotenv";
dotenv.config();

const DEFAULT_CONFIG = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIClient {

    openai: OpenAIApi;

    constructor(config: Configuration = DEFAULT_CONFIG) {
        this.openai = new OpenAIApi(config);
    }

    async getModels(): Promise<Model[]> {
        const response = await this.openai.listModels();
        if (response.status === 200) {
            return response.data.data;
        }
        throw new Error('Could not get models');
    }

    async chatCompletion(
        messages: Array<ChatCompletionRequestMessage>,
        model: OpenAIChatCompletionsModel = "gpt-3.5-turbo",
        parameters?: Omit<CreateChatCompletionRequest, 'model' | 'messages'>,
    ): Promise<CreateChatCompletionResponse> {
        const request = { model, messages, ...parameters };
        const response = await this.openai.createChatCompletion(request);
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error('Could not get chat completion');
        }
    }


    async streamChatCompletion(
        messages: Array<ChatCompletionRequestMessage>,
        model: OpenAIChatCompletionsModel = "gpt-3.5-turbo",
        callback: (chunk: { content: string }) => void,
        parameters?: Omit<CreateChatCompletionRequest, 'model' | 'messages' | 'stream'>
    ): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {

            const request = { model, messages, stream: true, ...parameters };
            const response = await this.openai.createChatCompletion(request, { responseType: 'stream' });
            let responseText = "";

            // @ts-ignore
            response.data.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    const message = line.replace(/^data: /, '');
                    if (message === '[DONE]') {
                        return; // Stream finished
                    }
                    try {
                        const parsed = JSON.parse(message);
                        if (parsed.choices[0].delta.content !== undefined) {
                            responseText += parsed.choices[0].delta.content;
                            callback(parsed.choices[0].delta);
                        }
                    } catch (error) {
                        console.error('Could not JSON parse stream message', message, error);
                    }
                }
            });

            // @ts-ignore
            response.data.on('end', () => {
                setTimeout(() => {
                    resolve(responseText);
                }, 10);
            });

            // @ts-ignore
            response.data.on('error', (err: Error) => {
                reject(err);
            });
        });
    }


    async completion(
        prompt: CreateCompletionRequestPrompt,
        model: OpenAICompletionsModelLegacy = "davinci",
        parameters: Omit<CreateCompletionRequest, 'model' | 'prompt'> = {},
    ): Promise<CreateCompletionResponse> {
        const request = { model, prompt, ...parameters };
        const response = await this.openai.createCompletion(request);
        if (response.status === 200) {
            return response.data;
        }
        throw new Error('Could not get completion');
    }

    async embeddings(
        input: CreateEmbeddingRequestInput, // takes either raw string or array of tokens
        model: OpenAIEmbeddingsModel = "text-embedding-ada-002"
    ): Promise<CreateEmbeddingResponse> {
        const request = { 
            model, 
            input 
        };
        const response = await this.openai.createEmbedding(request);
        if (response.status === 200) {
            return response.data;
        }
        throw new Error('Could not get embeddings');
    }
}
