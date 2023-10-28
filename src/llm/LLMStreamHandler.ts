import {
    Callbacks,
    BaseCallbackHandler,
    CallbackHandlerMethods,
    NewTokenIndices,
} from "langchain/callbacks";
import { LLMResult, AgentAction } from "langchain/schema";
import { Serialized } from "langchain/load/serializable";
import { Debug } from "../utils/debug.js";
import { renderCLIText } from "../cli/utils.js";

interface IRun {
    runId: string;
    runAlias?: string;
    output: string;
    message?: string;
}

export class LLMStreamCallbackHandler extends BaseCallbackHandler {
    name = "stream_callback_handler";
    aliasKey = "alias_";

    runAliases: Record<string, string> = {};
    runOutputs: Record<string, string> = {};

    runs: Record<string, IRun> = {};

    private parseAlias(tags?: string[]) : string | null {
        const splits = tags
            ?.find((t) => t.startsWith(this.aliasKey))
            ?.split(this.aliasKey);
        return splits ? splits[1] : "unknown";
    }

    streamCallback(runId: string) {
        let allText = "\n\n";

        allText += JSON.stringify(this.runAliases);

        allText += "\n\n";
        for (const [key, value] of Object.entries(this.runOutputs)) {
            allText += `=========[${key} | ${this.runAliases[key]}]==========\n`;
            allText += `${value}\n`;
        }
        
        renderCLIText(allText);
    }

    handleLLMNewToken(
        token: string,
        idx: NewTokenIndices,
        runId: string,
        parentRunId?: string | undefined,
        tags?: string[]
    ) {
        if (runId in this.runOutputs) {
            let currentOutput = this.runOutputs[runId];
            currentOutput += token;
            this.runOutputs[runId] = currentOutput;
        } else {
            this.runOutputs[runId] = token;
        }
        this.streamCallback(runId);
    }

    handleToolStart(
        tool: Serialized,
        input: string,
        runId: string,
        parentRunId?: string | undefined,
        tags?: string[]
    ) {
        console.log("handleToolStart " + this.parseAlias(tags));
        this.runAliases[runId] = this.parseAlias(tags) || "ToolStart";
        console.log(JSON.stringify(this.runAliases, null, 2) + " " + this.runAliases[runId]);
    }

    handleToolEnd(
        output: string,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ) {
        this.runAliases[runId] = this.parseAlias(tags) || "ToolEnd";
    }

    handleAgentAction(
        action: AgentAction,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ) {
        this.runAliases[runId] = this.parseAlias(tags) || "Action";    
    }
}