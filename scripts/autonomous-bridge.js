const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 18789; // The official Circuito Bridge Port

app.use(cors());
app.use(express.json());

// --- Global State ---
let activeProjectPath = process.cwd();

// --- Security Middleware ---
// You can add an API Key check here later for global users
app.use((req, res, next) => {
    console.log(`[Autonomous Link] ${req.method} ${req.path}`);
    next();
});

// --- Core Tools ---

/**
 * 📂 TOOL: List Files
 * Gives the AI a map of the project
 */
app.get('/v1/files', (req, res) => {
    try {
        const files = fs.readdirSync(activeProjectPath, { recursive: true })
            .filter(f => !f.includes('node_modules') && !f.includes('.next') && !f.includes('.git'));
        res.json({ status: 'success', files });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

/**
 * 📖 TOOL: Read File
 */
app.post('/v1/read', (req, res) => {
    const { filePath } = req.body;
    try {
        // Security: Prevent directory traversal
        if (filePath.includes('..')) {
            return res.status(403).json({ status: 'error', message: 'Security: Directory traversal attempt blocked.' });
        }
        const fullPath = path.join(activeProjectPath, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        res.json({ status: 'success', content });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

/**
 * ✍️ TOOL: Write/Patch File
 */
app.post('/v1/write', (req, res) => {
    const { filePath, content } = req.body;
    try {
        // Security: Prevent directory traversal
        if (filePath.includes('..')) {
            return res.status(403).json({ status: 'error', message: 'Security: Directory traversal attempt blocked.' });
        }
        
        const fullPath = path.join(activeProjectPath, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(fullPath, content);
        res.json({ status: 'success', message: `File ${filePath} updated successfully.` });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

/**
 * 🎯 TOOL: Change Active Project
 * Allows the Web UI to pick a folder for the user
 */
app.post('/v1/set-project', (req, res) => {
    const { projectPath } = req.body;
    if (!fs.existsSync(projectPath)) {
        return res.status(400).json({ status: 'error', message: 'Project path does not exist on this machine.' });
    }
    activeProjectPath = projectPath;
    console.log(`\n📂 Project Switched: ${activeProjectPath}`);
    res.json({ status: 'success', activeProjectPath });
});

/**
 * 💻 TOOL: Execute Terminal Command (e.g., compile)
 */
app.post('/v1/execute', (req, res) => {
    const { command } = req.body;

    // Safety: Only allow specific hardware commands
    const allowedPrefixes = ['arduino-cli', 'npm run', 'pnpm', 'esptool', 'dir', 'cd', 'type', 'echo', 'pwd', 'ls']; // Added basic navigation for AI agent resilience
    const isAllowed = allowedPrefixes.some(prefix => command.startsWith(prefix));

    if (!isAllowed) {
        return res.status(403).json({ status: 'error', message: 'Command not in safety allow-list.' });
    }

    exec(command, { cwd: activeProjectPath }, (error, stdout, stderr) => {
        res.json({
            status: error ? 'error' : 'success',
            stdout,
            stderr,
            exitCode: error ? error.code : 0
        });
    });
});

// --- Status Endpoint ---
app.get('/v1/status', (req, res) => {
    res.json({
        status: 'online',
        version: '1.0.0-autonomous',
        projectPath: activeProjectPath,
        platform: process.platform
    });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log('\n' + ' '.repeat(10) + '🧠 CIRCUITO AUTONOMOUS LINK ACTIVE 🧠');
    console.log(''.padEnd(50, '='));
    console.log(`📡 Local Gateway: http://127.0.0.1:${PORT}`);
    console.log(`📂 Project Root:  ${process.cwd()}`);
    console.log(''.padEnd(50, '='));
    console.log('\nWaiting for commands from the Cloud Brain...');
});
