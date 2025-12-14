import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oldEnvPath = path.resolve(__dirname, '../../.env');
const newEnvPath = path.join(__dirname, '.env');

if (fs.existsSync(oldEnvPath)) {
    let oldContent = fs.readFileSync(oldEnvPath, 'utf8');
    // Fix double assignment if present based on my observation "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY=..."
    oldContent = oldContent.replace(/ANTHROPIC_API_KEY=ANTHROPIC_API_KEY=/g, 'ANTHROPIC_API_KEY=');

    fs.writeFileSync(newEnvPath, oldContent);
    console.log("Keys migrated successfully!");
} else {
    console.error("Could not find old .env");
}
