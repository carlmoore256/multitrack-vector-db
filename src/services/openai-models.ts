export type OpenAIChatCompletionsModel =
  | "gpt-4"
  | "gpt-4-0613"
  | "gpt-4-32k"
  | "gpt-4-32k-0613"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-0613"
  | "gpt-3.5-turbo-16k"
  | "gpt-3.5-turbo-16k-0613";


export type OpenAICompletionsModelLegacy = 
| "text-davinci-003"
| "text-davinci-002"
| "text-davinci-001"
| "text-curie-001"
| "text-babbage-001"
| "text-ada-001"
| "davinci"
| "curie"
| "babbage"
| "ada";

export type OpenAITranscriptionModel =
| "whisper-1"

export type OpenAITranslationModel = 
| "whisper-1"

export type OpenAIFineTuneModel =
| "davinci"
| "curie"
| "babbage"
| "ada";

export type OpenAIEmbeddingsModel =
| "text-embedding-ada-002"
| "text-similarity-*-001"
| "text-search-*-*-001"
| "code-search-*-*-001"

export type OpenAIModerationsModel =
| "text-moderation-stable"
| "text-moderation-latest"