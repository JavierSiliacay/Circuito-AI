import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const { code, boardId, fqbn } = await req.json();

        if (!code || !fqbn) {
            return NextResponse.json({ error: 'Missing code or board configuration' }, { status: 400 });
        }

        // Use a persistent project-level directory for compilation to enable incremental builds
        // Arduino requires the .ino file name to match the directory name
        const sketchName = boardId || 'sketch';
        const persistentDir = path.join(process.cwd(), 'build-system', sketchName);
        const sketchPath = path.join(persistentDir, `${sketchName}.ino`);
        const buildPath = path.join(persistentDir, 'build');
        const binDir = path.join(process.cwd(), 'bin');
        const cliPath = path.join(binDir, 'arduino-cli.exe');

        // Ensure directories exist
        await fs.mkdir(persistentDir, { recursive: true });
        await fs.mkdir(buildPath, { recursive: true });

        // Write the code to the persistent sketch file
        await fs.writeFile(sketchPath, code);

        try {
            // Find the CLI
            try {
                await fs.access(cliPath);
            } catch {
                return NextResponse.json({
                    error: 'Compiler not installed. Please run ".\\scripts\\setup-arduino.ps1" first.'
                }, { status: 500 });
            }

            // Compile command with persistent paths for 5s incremental builds
            // Note: --build-cache-path is deprecated, --build-path handles both in modern CLI
            const compileCmd = `"${cliPath}" compile --fqbn ${fqbn} --build-path "${buildPath}" "${sketchPath}"`;

            const { stdout, stderr } = await execAsync(compileCmd);

            // Find the .bin file
            const binPath = path.join(buildPath, `${sketchName}.ino.bin`);

            try {
                const binBuffer = await fs.readFile(binPath);

                // Note: We don't delete buildPath/persistentDir because we want 
                // to reuse the .o files for the 5-second incremental compile!

                // Return the binary file
                return new NextResponse(binBuffer, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename="firmware.bin"`,
                    },
                });
            } catch (e) {
                return NextResponse.json({
                    error: 'Compilation finished but binary not found',
                    details: stdout + stderr
                }, { status: 500 });
            }

        } catch (err: any) {
            // Error during compilation
            return NextResponse.json({
                error: 'Compilation failed',
                details: err.stderr || err.stdout || err.message
            }, { status: 500 });
        }

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
    }
}
