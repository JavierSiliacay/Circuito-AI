/**
 * 🔗 Autonomous Link Connector
 * This utility talks to the local autonomous-bridge.js script.
 * It is used by the LangGraph "Tool Nodes" to execute actions on the user's machine.
 */

const BRIDGE_URL = 'http://127.0.0.1:18789';

export interface BridgeStatus {
    online: boolean;
    version?: string;
    projectPath?: string;
}

/**
 * Checks if the user's local bridge is running
 */
export async function checkAutonomousLink(): Promise<BridgeStatus> {
    try {
        const response = await fetch(`${BRIDGE_URL}/v1/status`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        return { online: true, ...data };
    } catch (err) {
        return { online: false };
    }
}

/**
 * Executes a file-write on the user's machine
 */
export async function bridgeWriteFile(filePath: string, content: string) {
    const response = await fetch(`${BRIDGE_URL}/v1/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content })
    });
    return response.json();
}

/**
 * Executes a terminal command on the user's machine (e.g., compile)
 */
export async function bridgeExecute(command: string) {
    const response = await fetch(`${BRIDGE_URL}/v1/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
    });
    return response.json();
}

/**
 * Reads a file from the user's machine
 */
export async function bridgeReadFile(filePath: string) {
    const response = await fetch(`${BRIDGE_URL}/v1/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
    });
    return response.json();
}

/**
 * Changes the active project path on the bridge
 */
export async function bridgeSetProject(projectPath: string) {
    const response = await fetch(`${BRIDGE_URL}/v1/set-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
    });
    return response.json();
}

/**
 * Fetches the project file structure
 */
export async function bridgeListFiles() {
    const response = await fetch(`${BRIDGE_URL}/v1/files`, {
        method: 'GET',
        mode: 'cors'
    });
    return response.json();
}
