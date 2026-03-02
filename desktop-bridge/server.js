const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3002;

// Configuration
const ARDUINO_CLI_PATH = path.join(__dirname, '..', 'bin', 'arduino-cli.exe');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 1. Status Check
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        message: 'Circuito AI Bridge is active',
        cliFound: fs.existsSync(ARDUINO_CLI_PATH)
    });
});

// 2. Write Code to Local File
app.post('/write-code', (req, res) => {
    const { filePath, content } = req.body;

    if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'Missing path or content' });
    }

    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[Bridge] Written code to: ${filePath}`);
        res.json({ success: true, message: `Saved to ${filePath}` });
    } catch (err) {
        console.error(`[Bridge] Save error:`, err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/read-file', (req, res) => {
    let { path: filePath } = req.query;

    if (!filePath) {
        return res.status(400).json({ error: 'Missing path parameter' });
    }

    try {
        // Resolution Logic
        let resolvedPath = filePath;

        if (!fs.existsSync(resolvedPath)) {
            // Try appending .ino in case the user omitted it
            if (fs.existsSync(resolvedPath + '.ino')) {
                resolvedPath += '.ino';
            } else {
                return res.status(404).json({ error: 'File not found at specified path.' });
            }
        }

        // If it's a directory, try to find the primary Arduino sketch
        if (fs.lstatSync(resolvedPath).isDirectory()) {
            const folderName = path.basename(resolvedPath);
            const arduinoFile = path.join(resolvedPath, `${folderName}.ino`);
            if (fs.existsSync(arduinoFile)) {
                resolvedPath = arduinoFile;
            } else {
                const files = fs.readdirSync(resolvedPath);
                const match = files.find(f => f.endsWith('.ino') || f.endsWith('.cpp'));
                if (match) {
                    resolvedPath = path.join(resolvedPath, match);
                } else {
                    return res.status(404).json({ error: 'No Arduino files found in directory.' });
                }
            }
        }

        const content = fs.readFileSync(resolvedPath, 'utf8');
        res.json({ success: true, content, resolvedPath });
    } catch (err) {
        console.error(`[Bridge] Read error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Compile and Flash (using arduino-cli)
app.post('/flash', (req, res) => {
    const { board, port, sketchPath } = req.body;

    if (!board || !port || !sketchPath) {
        return res.status(400).json({ error: 'Missing board, port, or sketchPath' });
    }

    console.log(`[Bridge] Starting flash for ${board} on ${port}...`);

    // Command to compile and upload
    const command = `"${ARDUINO_CLI_PATH}" compile --upload -b ${board} -p ${port} "${sketchPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Bridge] Flash error:`, stderr);
            return res.json({
                success: false,
                error: stderr || error.message,
                output: stdout
            });
        }
        console.log(`[Bridge] Flash successful!`);
        res.json({ success: true, output: stdout });
    });
});

// 4. Open File Selection Dialog (Native Windows)
app.get('/select-file', (req, res) => {
    const psFile = path.join(__dirname, 'select-file.ps1');
    const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Bridge] Picker Error:`, error.message);
            return res.status(500).json({ error: 'Bridge Picker Error', details: error.message });
        }

        const output = stdout.trim();
        if (output) {
            console.log(`[Bridge] Selected: ${output}`);
            res.json({ success: true, filePath: output });
        } else {
            console.log(`[Bridge] Selection cancelled`);
            res.json({ success: false, message: 'Cancelled' });
        }
    });
});

// Final JSON Error Handlers (Ensure no HTML is ever returned)
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

app.use((err, req, res, next) => {
    console.error('[Bridge Internal Error]', err);
    res.status(500).json({ error: 'Bridge Internal Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`========================================`);
    // eslint-disable-next-line no-console
    console.log(`🚀 Circuito AI Bridge Running on http://localhost:${PORT}`);
    console.log(`Ready for communication with the web IDE.`);
    console.log(`========================================`);
});
