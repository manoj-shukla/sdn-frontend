const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    if (content.includes('alert(')) {
        // Check if import is already there
        let hasImport = content.includes('import { toast } from "sonner"');

        // Simple regex to match alert((...)) or alert(...) 
        // This is simple so we don't mess up.
        // Replace alert(msg) with toast.error(msg) if msg has "failed", "Error", "denied" (case insensitive)
        // otherwise toast.success(msg)

        // regex: `alert(` followed by anything until matched `)`
        const regex = /\balert\s*\(([^)]+)\)/g;

        content = content.replace(regex, (match, p1) => {
            let lower = p1.toLowerCase();
            if (lower.includes('error') || lower.includes('fail') || lower.includes('denied') || lower.includes('require')) {
                return `toast.error(${p1})`;
            } else if (lower.includes('success') || lower.includes('approv') || lower.includes('submit')) {
                return `toast.success(${p1})`;
            } else {
                // default
                return `toast(${p1})`;
            }
        });

        if (content !== originalContent && !hasImport) {
            // Find the last import line or just add to the top
            const importMatch = content.match(/import .*?;?\n/g);
            let importText = 'import { toast } from "sonner";\n';
            if (importMatch) {
                let lastImport = importMatch[importMatch.length - 1];
                content = content.replace(lastImport, lastImport + importText);
            } else {
                content = importText + content;
            }
        }

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated", filePath);
        }
    }
}

const targetDir = path.join(__dirname, '../src');
walkDir(targetDir, processFile);
