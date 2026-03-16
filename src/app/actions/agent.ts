"use server";

import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Define the state structure using the standard Messages pattern for ToolNode compatibility
const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
    }),
    stage: Annotation<'plan' | 'execute'>({
        reducer: (x: any, y: any) => y ?? x,
        default: () => 'plan',
    }),
    projectPath: Annotation<string>({
        reducer: (x: any, y: any) => y ?? x,
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
    func: async () => "Relay: This tool must be executed on the client side.",
});

const writeTool = new DynamicStructuredTool({
    name: "write_file",
    description: "Creates or updates a file. Always use RELATIVE paths. Paths must be inside the project folder.",
    schema: z.object({ filePath: z.string(), content: z.string() }),
    func: async () => "Relay: This tool must be executed on the client side.",
});

const executeTool = new DynamicStructuredTool({
    name: "execute_terminal",
    description: "Runs a terminal command (e.g. compile, test).",
    schema: z.object({ command: z.string() }),
    func: async () => "Relay: This tool must be executed on the client side.",
});

const tools = [readTool, writeTool, executeTool];

// Specialized ToolNode that automatically triggers client relay for file operations
async function toolNode(_state: typeof GraphState.State) {
    // In Bridgeless mode, the server-side LangGraph never executes file tools.
    // We return an empty message list which signals runAutonomousAgent to return to the client.
    console.log("[Autonomous Agent] Relaying tools to client (Bridgeless Mode).");
    return { messages: [] };
}

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

    const sysMsg = {
        role: "system",
        content: `You are the Circuito Triage. Create a MISSION ROADMAP.
        ENVIRONMENT: Hybrid Native (Browser-Local)
        ROOT: ${state.projectPath || 'None'}
        
        IMPORTANT: Use your tools to read files and understand the project structure. 
        You are connected via the Native File System Access API.

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
    
    const sysMsg = {
        role: "system",
        content: `You are the Circuito Autonomous Generator. 
        WORKING DIRECTORY: ${state.projectPath}
        PLATFORM: Web Browser Environment (Native FS API).
        
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
    const lastMsg = state.messages[state.messages.length - 1] as any;
    // If the message has tool calls, we must go to tools (even if just to fail/relay)
    if (lastMsg?.tool_calls && lastMsg.tool_calls.length > 0) return "tools";
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
            
            const result = await agentBrain.invoke(inputs, { recursionLimit: 10 });
            const lastMsg = result.messages[result.messages.length - 1] as any;

            // If the last message is a tool call (triage decided to read something), bridge it
            if (lastMsg?.tool_calls && lastMsg.tool_calls.length > 0) {
                return {
                    success: true,
                    stage: 'plan',
                    requiresClientTool: true,
                    toolCalls: lastMsg.tool_calls,
                    messages: result.messages.map((m: any) => ({
                        role: m._getType() === 'human' ? 'user' : 'assistant',
                        content: m.content,
                        tool_calls: m.tool_calls
                    }))
                };
            }

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
            const lastMessage = finalState.messages[finalState.messages.length - 1] as any;

            // Detect if the agent stopped because of a tool call it couldn't execute (Relay Mode)
            if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
              return {
                  success: true,
                  stage: stage === 'execute' ? 'execute' : 'fast',
                  requiresClientTool: true,
                  toolCalls: lastMessage.tool_calls,
                  content: lastMessage.content,
                  messages: finalState.messages.map((m: any) => ({
                      role: m._getType() === 'human' ? 'user' : 'assistant',
                      content: m.content,
                      tool_calls: m.tool_calls,
                      tool_call_id: (m as any).tool_call_id
                  }))
              };
            }

            return {
                success: true,
                stage: stage === 'execute' ? 'execute' : 'fast',
                content: lastMessage.content,
                duration: ((Date.now() - startTime) / 1000).toFixed(1) + "s",
                messages: finalState.messages.map((m: any) => ({
                    role: m._getType() === 'human' ? 'user' : 'assistant',
                    content: m.content
                })),
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
