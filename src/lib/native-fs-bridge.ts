/**
 * 🌐 NATIVE BROWSER FS BRIDGE
 * This utility wraps the Web File System Access API to behave like the legacy Node.js bridge.
 * It allows the Autonomous Agent to work GLOBALLY on Vercel/Cloud without downloading any scripts.
 */

export interface NativeBridgeResult {
    success: boolean;
    content?: string;
    message?: string;
    files?: string[];
    stdout?: string;
    stderr?: string;
}

/**
 * 📂 LIST FILES
 */
export async function nativeListFiles(dirHandle: FileSystemDirectoryHandle): Promise<NativeBridgeResult> {
    try {
        const files: string[] = [];
        async function scan(handle: FileSystemDirectoryHandle, path = "") {
            for await (const entry of (handle as any).values()) {
                const relativePath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file') {
                    files.push(relativePath);
                } else if (entry.kind === 'directory') {
                    files.push(relativePath + "/");
                    // Limit depth or total files for performance
                    if (files.length < 100) {
                        await scan(entry as FileSystemDirectoryHandle, relativePath);
                    }
                }
            }
        }
        await scan(dirHandle);
        return { success: true, files };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * 📖 READ FILE
 */
export async function nativeReadFile(dirHandle: FileSystemDirectoryHandle, relativePath: string): Promise<NativeBridgeResult> {
    try {
        const parts = relativePath.split(/[\\\/]/).filter(Boolean);
        let currentHandle: any = dirHandle;

        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }

        const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1]);
        const file = await fileHandle.getFile();
        const content = await file.text();
        return { success: true, content };
    } catch (error: any) {
        return { success: false, message: `File not found: ${relativePath}` };
    }
}

/**
 * ✍️ WRITE FILE
 */
export async function nativeWriteFile(dirHandle: FileSystemDirectoryHandle, relativePath: string, content: string): Promise<NativeBridgeResult> {
    try {
        const parts = relativePath.split(/[\\\/]/).filter(Boolean);
        let currentHandle: any = dirHandle;

        // Ensure directories exist
        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i], { create: true });
        }

        const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return { success: true, message: `Successfully wrote ${relativePath}` };
    } catch (error: any) {
        return { success: false, message: `Write failed: ${error.message}` };
    }
}

/**
 * 🛠️ EXECUTE (Simulated)
 * Browsers cannot run arbitrary OS commands for security.
 * We simulate common Arduino tasks or return a "Manual Action Required" message.
 */
export async function nativeExecuteSim(command: string): Promise<NativeBridgeResult> {
    if (command.includes('dir') || command.includes('ls')) {
        return { success: true, stdout: "Please use the 'list_files' tool for directory structure." };
    }
    
    return { 
        success: false, 
        stderr: `COMPILATION ERROR: System commands like '${command}' cannot be executed directly from the browser for security. \n\nPRO-TIP: Use the Arduino IDE to Verify/Upload the files saved by the AI.` 
    };
}
