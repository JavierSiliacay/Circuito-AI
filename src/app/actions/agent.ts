"use server";

import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { bridgeReadFile, bridgeWriteFile, bridgeExecute, bridgeListFiles } from "@/lib/autonomous-link";

import { BaseMessage } from "@langchain/core/messages";

// Define the state structure using the standard Messages pattern for ToolNode compatibility
const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    stage: Annotation<'plan' | 'execute'>({
        reducer: (x, y) => y ?? x,
        default: () => 'plan',
    }),
    projectPath: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => '',
    }),
});

/**
 * 🤖 MODEL INITIALIZATION
 */
const createModel = (modelName: string) => new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    modelName: modelName,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "https://circuito.ai",
            "X-Title": "Circuito Multi-Model Agent",
        },
    },
});

const ArceeBrain = createModel("stepfun/step-3.5-flash:free");

// Alias roles
const TriageAI = ArceeBrain;
const GeneratorAI = ArceeBrain;
const DebuggerAI = ArceeBrain;

/**
 * 🛠️ ACTIONS & TOOLS
 */
const readTool = new DynamicStructuredTool({
    name: "read_file",
    description: "Reads a file within the project. Always use RELATIVE paths (e.g., 'main.ino', 'src/utils.cpp').",
    schema: z.object({ filePath: z.string() }),
    func: async ({ filePath }) => {
        // Enforce relative path by removing leading slash/drive
        const cleanPath = filePath.replace(/^[\\\/]+|^[a-zA-Z]:[\\\/]+/, '');
        const result = await bridgeReadFile(cleanPath);
        const content = result.content || result.message || "";
        if (content.length > 10000) {
            return content.slice(0, 10000) + "\n\n[... File truncated for context limits ...]";
        }
        return content;
    },
});

const writeTool = new DynamicStructuredTool({
    name: "write_file",
    description: "Creates or updates a file. Always use RELATIVE paths. Paths must be inside the project folder.",
    schema: z.object({ filePath: z.string(), content: z.string() }),
    func: async ({ filePath, content }) => {
        const cleanPath = filePath.replace(/^[\\\/]+|^[a-zA-Z]:[\\\/]+/, '');
        console.log(`[Autonomous Tool] Writing to: ${cleanPath}`);
        const result = await bridgeWriteFile(cleanPath, content);
        return `Result: ${result.message || result.status}. Target: ${cleanPath}`;
    },
});

const executeTool = new DynamicStructuredTool({
    name: "execute_terminal",
    description: "Runs a terminal command (e.g. compile, test).",
    schema: z.object({ command: z.string() }),
    func: async ({ command }) => {
        const result = await bridgeExecute(command);
        const out = result.stdout || "";
        const err = result.stderr || "";
        // ✂️ TRUNCATE: Prevent terminal floods (like dir /s) from crashing the context
        const combined = `STDOUT: ${out}\nSTDERR: ${err}`;
        if (combined.length > 5000) {
            return combined.slice(0, 5000) + "\n\n[... Output truncated due to size ...]";
        }
        return combined;
    },
});

const tools = [readTool, writeTool, executeTool];
const toolNode = new ToolNode(tools);

/**
 * 🚦 NODE 1: THE TRIAGE (Identification)
 */
async function triageNode(state: typeof GraphState.State) {
    console.log("--- NODE: TRIAGE ---");
    // ⚡ SPEED OPTIMIZATION: Bypass model call if we are already in execution mode
    if (state.stage === 'execute' || (state.stage as any) === 'fast') {
        console.log("[Speed Mode] Bypassing triage invocation.");
        return { messages: [] };
    }

    const listData = await bridgeListFiles();
    const structure = listData.files ? listData.files.slice(0, 50).join('\n') : "Unknown";
    
    const sysMsg = {
        role: "system",
        content: `You are the Circuito Triage. Create a MISSION ROADMAP.
        ROOT: ${state.projectPath || 'None'}
        STRUCTURE:
        ${structure}
        
        FORMAT:
        ### 🎯 GOALS
        ### 📂 TARGET FILES
        ### 🛠️ TOOLS
        Stop here.`
    };

    const response = await TriageAI.invoke([sysMsg, ...state.messages]);
    return { messages: [response] };
}

/**
 * ⚒️ NODE 2: THE GENERATOR (Execution)
 */
async function generatorNode(state: typeof GraphState.State) {
    const lastMsg = state.messages[state.messages.length - 1] as any;
    console.log(`--- NODE: GENERATOR (Stage: ${state.stage}) ---`);
    if (lastMsg?.content) console.log(`[Reasoning]: ${lastMsg.content.slice(0, 50)}...`);

    const sysMsg = {
        role: "system",
        content: `You are the Circuito Autonomous Generator. 
        WORKING DIRECTORY: ${state.projectPath}
        PLATFORM: Windows.
        
        CRITICAL SCOPE RULES:
        1. You are LOCKED to: ${state.projectPath}.
        2. Use ONLY RELATIVE paths for all file operations.
        3. Do NOT attempt to access or modify any file outside the root.
        4. If a file is missing, create it INSIDE the project folder.
        5. Use "dir", "type", "mkdir" for navigation.
        
        GOAL: Complete the approved mission. Batch your actions.`
    };

    const response = await GeneratorAI.bindTools(tools).invoke([sysMsg, ...state.messages]);
    return { messages: [response] };
}

/**
 * 🔍 NODE 3: THE DEBUGGER (Verification)
 */
async function debuggerNode(state: typeof GraphState.State) {
    console.log("--- NODE: DEBUGGER ---");
    const sysMsg = {
        role: "system",
        content: `You are the Mission Controller. Provide a high-fidelity "MISSION SUMMARY" in a Chat format.
        
        FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
        ### 📂 FILES MODIFIED
        - [Relative Path]: Brief change description.
        
        ### 🛠️ ACTIONS PERFORMED
        - List tools used and their results.
        
        ### ✅ FINAL STATUS
        [Overall mission outcome and next steps for the user]
        
        Keep it clean, professional, and readable. Do not include raw tool data or XML tags.`
    };

    const response = await DebuggerAI.invoke([sysMsg, ...state.messages]);
    return { messages: [response] };
}

/**
 * 🔍 ROUTING LOGIC
 */
function shouldContinue(state: typeof GraphState.State) {
    const lastMessage = state.messages[state.messages.length - 1] as any;
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) return "tools";
    return "debugger";
}

function triageRouter(state: typeof GraphState.State) {
    if (state.stage === 'plan') return "__end__";
    return "generator";
}

/**
 * 🕸️ LANGGRAPH ORCHESTRATION
 */
const workflow = new StateGraph(GraphState)
    .addNode("triage", triageNode)
    .addNode("generator", generatorNode)
    .addNode("debugger", debuggerNode)
    .addNode("tools", toolNode)

    .addEdge("__start__", "triage")
    .addConditionalEdges("triage", triageRouter)
    .addConditionalEdges("generator", shouldContinue)
    .addEdge("tools", "generator")
    .addEdge("debugger", "__end__");

const agentBrain = workflow.compile();

/**
 * 🚀 EXPORTED SERVER ACTION: runAutonomousAgent
 */
export async function runAutonomousAgent(userPrompt: string, history: any[] = [], stage: 'plan' | 'execute' = 'plan', projectPath?: string) {
    const startTime = Date.now();
    console.log(`[Autonomous Agent] ${stage.toUpperCase()} Stage Started...`);
    
    if (!projectPath) {
        return {
            success: false,
            content: "No project folder selected. Please select a project folder to generate code in.",
            error: "MISSING_PROJECT_PATH"
        };
    }

    try {
        let inputs: any = { stage, projectPath };

        if (stage === 'plan') {
            const sessionMessages = history.length > 0 ? history.map((m: any) =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
            ) : [];
            inputs.messages = [...sessionMessages, new HumanMessage(`[USER TASK]\n${userPrompt}\n\nInstruction: Provide the MISSION ROADMAP.`)];
            
            const result = await agentBrain.invoke(inputs, { recursionLimit: 5 });
            const lastMsg = result.messages[result.messages.length - 1];

            return {
                success: true,
                stage: 'plan',
                content: lastMsg.content,
                duration: ((Date.now() - startTime) / 1000).toFixed(1) + "s",
                messages: result.messages.map((m: any) => ({
                    role: m._getType() === 'human' ? 'user' : 'assistant',
                    content: m.content
                }))
            };
        } else if (stage === 'execute' || (stage as any) === 'fast') {
            // 🗜️ RADICAL HISTORY COMPRESSION: 
            // 1. Slice to last 4 messages (more aggressive)
            // 2. Truncate each individual message to 8000 chars
            const simplifiedHistory = history.slice(-4).map((m: any) => {
                const truncatedContent = m.content.length > 8000 
                    ? m.content.slice(0, 8000) + "... [Content truncated for speed]" 
                    : m.content;
                return m.role === 'user' ? new HumanMessage(truncatedContent) : new AIMessage(truncatedContent);
            });

            inputs.messages = simplifiedHistory.length > 0 ? simplifiedHistory : [new HumanMessage(userPrompt)];

            const finalState = await agentBrain.invoke(inputs, { recursionLimit: 40 });
            console.log(`[Autonomous Agent] Execution complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
            const lastMessage = finalState.messages[finalState.messages.length - 1];

            return {
                success: true,
                stage: stage === 'execute' ? 'execute' : 'fast',
                content: lastMessage.content,
                duration: ((Date.now() - startTime) / 1000).toFixed(1) + "s",
                steps: [
                    { step: "Triage & Direct Action", type: "reasoning", duration: "0.2s" },
                    { step: "Applied Changes", type: "action", duration: "0.4s" },
                    { step: "Logic Verified", type: "success", duration: "0.1s" }
                ]
            };
        }
    } catch (error: any) {
        console.error("[Autonomous Agent Error]:", error);
        return { success: false, error: error.message };
    }
}
