import { OpenAI } from "langchain/llms/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import { LLMStreamCallbackHandler } from "./LLMStreamHandler.js";
import dotenv from "dotenv";
dotenv.config();
export const run = async () => {
  const model = new OpenAI({ 
    temperature: 0,
    streaming: true,
 });
  const tools = [
    new DynamicTool({
      name: "FOO",
      description:
        "call this to get the value of foo. input should be an empty string.",
      func: async () => "baz",
      tags: ["alias_foo"],
    }),
    new DynamicTool({
      name: "BAR",
      description:
        "call this to get the value of bar. input should be an empty string.",
      func: async () => "baz1",
      tags: ["alias_bar"],
    }),
  ];

  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "zero-shot-react-description",
    tags: ["test"],
  });

  console.log("Loaded agent.");

  const input = `What is the value of foo? What is the value of bar?`;

  console.log(`Executing with input "${input}"...`);

  const result = await executor.call({ input }, [new LLMStreamCallbackHandler()]);

  console.log(`Got output ${result.output}`);
}

run();


















// {
//   handleChainStart(chain) {
//       console.log("handleChainStart");
//   },
//   handleLLMStart(llm, _prompts: string[]) {
//       console.log("handleLLMStart");
//   },
//   handleToolStart(tool, input, runId, parentRunId, tags) {
//     const toolName = tags?.find((t) => t.startsWith("tool_"))?.split("tool_")[1] || "unknown";

//     console.log("handleToolStart | tool: ", toolName, " | input: ", input , " | runId: ", runId);
      
//   },
//   handleToolEnd(output, runId) {
//       console.log("handleToolEnd | output: ", output, " | runId: ", runId);
//   },
//   handleText(text, runId) {
//       console.log("handleText | text: ", text, " | runId: ", runId);
//   }

// }