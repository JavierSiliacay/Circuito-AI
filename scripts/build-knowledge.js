const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = 'C:\\Users\\User\\Desktop\\ARDUINO CODES';
const OUTPUT_PATH = './src/lib/arduino-knowledge.ts';

function scanProjects(dir) {
    const projects = [];
    if (!fs.existsSync(dir)) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const projectDir = path.join(dir, entry.name);
            const files = fs.readdirSync(projectDir);
            const inoFile = files.find(f => f.endsWith('.ino'));

            if (inoFile) {
                const content = fs.readFileSync(path.join(projectDir, inoFile), 'utf-8');
                const lines = content.split('\n');

                // Extract high-quality description
                let headerComments = [];
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                        headerComments.push(trimmed.replace(/\/\/|\/\*|\*|\*\//g, '').trim());
                    } else if (trimmed !== '') {
                        break;
                    }
                }
                const description = headerComments.filter(l => l.length > 5).join(' ').slice(0, 300);

                // Extract PINS/GPIOs
                const pinRegex = /(?:const\s+int|#define|int)\s+(\w+)\s*=?\s*(\d+|\w+)/g;
                const pinsFound = new Set();
                let match;
                while ((match = pinRegex.exec(content)) !== null) {
                    if (match[2].length < 5) {
                        pinsFound.add(match[1] + '=' + match[2]);
                    }
                }

                // Identify Libraries
                const libRegex = /#include\s*[<"](.+)[>"]/g;
                const libsFound = new Set();
                while ((match = libRegex.exec(content)) !== null) {
                    libsFound.add(match[1]);
                }

                projects.push({
                    id: entry.name.toLowerCase(),
                    title: entry.name.replace(/_/g, ' '),
                    description: description || 'Source file analyzed but no comments found.',
                    pins: Array.from(pinsFound).slice(0, 15),
                    libraries: Array.from(libsFound).slice(0, 8),
                });
            }
        }
    }
    return projects;
}

const projects = scanProjects(KNOWLEDGE_DIR);

const tsContent = '/**\n' +
    ' * Circuito AI — Personal Hardware Intelligence Base\n' +
    ' * Generated on: ' + new Date().toLocaleString() + '\n' +
    ' * This file is automatically populated from your desktop "ARDUINO CODES" folder.\n' +
    ' */\n\n' +
    'export interface ProjectKnowledge {\n' +
    '    id: string;\n' +
    '    title: string;\n' +
    '    description: string;\n' +
    '    pins: string[];\n' +
    '    libraries: string[];\n' +
    '}\n\n' +
    'export const LOCAL_PROJECTS: ProjectKnowledge[] = ' + JSON.stringify(projects, null, 2) + ';\n\n' +
    'export const getHardwareKnowledgeString = () => {\n' +
    '    return LOCAL_PROJECTS.map(p => \n' +
    '        "- PROJECT: " + p.title + "\\n" + \n' +
    '        "  DESC: " + p.description + "\\n" + \n' +
    '        "  PINS: " + p.pins.join(", ") + "\\n" + \n' +
    '        "  LIBS: " + p.libraries.join(", ") + "\\n"\n' +
    '    ).join("\\n");\n' +
    '};\n';

fs.writeFileSync(OUTPUT_PATH, tsContent);
console.log('✅ Autonomous link optimized with ' + projects.length + ' personal projects.');
