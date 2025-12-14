import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pc from 'picocolors';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

// Ensure .env exists
if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '# Universal API Vault Keys\nANTHROPIC_API_KEY=\nGEMINI_API_KEY=\nOPENAI_API_KEY=\nWIX_API_KEY=\nWIX_SITE_ID=\n');
    console.log(pc.yellow('⚠ Created default .env file. Please populate it.'));
}

dotenv.config({ path: envPath });

const app = express();
const PORT = 9999;

app.use(cors());

// Health Check
app.get('/', (req, res) => {
    res.send({ status: 'Universal API Vault is Running 🔒', keys_loaded: Object.keys(process.env).filter(k => k.endsWith('_KEY')).map(k => k.split('_')[0]) });
});

// --- Proxy Definitions ---

// 1. Anthropic
const anthropicProxy = createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/anthropic': '', // Remove the /proxy/anthropic prefix
    },
    onProxyReq: (proxyReq, req, res) => {
        const key = process.env.ANTHROPIC_API_KEY;
        if (key) {
            proxyReq.setHeader('x-api-key', key);
            // Anthropic also needs 'anthropic-version' usually, but the client sends it.
            // If the client doesn't send it, we could default it here, but safer to let client handle versioning.
        } else {
            console.error(pc.red('❌ Missing ANTHROPIC_API_KEY in Vault'));
        }
        console.log(pc.blue(`➜ Proxied Anthropic Request: ${req.url}`));
    }
});
app.use('/proxy/anthropic', anthropicProxy);

// 2. Gemini
const geminiProxy = createProxyMiddleware({
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/gemini': '',
    },
    onProxyReq: (proxyReq, req, res) => {
        // Gemini sends key in query param usually: ?key=API_KEY
        // But we can try injecting it if the library supports headers or we manipulate the query string.
        // Google GenAI SDK puts it in query string. 
        // We might need to intercept and add the query param if it's missing, 
        // BUT simpler: The SDK constructs the URL. 
        // If we want to hide it, the SDK needs to be told to NOT send it, or send a dummy.
        // Actually, for Gemini, it's easier if we accept it as a header `x-goog-api-key` if the SDK supports it (REST API does).

        const key = process.env.GEMINI_API_KEY;
        if (key) {
            proxyReq.setHeader('x-goog-api-key', key);
            // We also need to strip it from query if it was passed as dummy? 
            // For now, let's assume the local client won't pass it, so we add it.
        }
        console.log(pc.cyan(`➜ Proxied Gemini Request: ${req.url}`));
    }
});
app.use('/proxy/gemini', geminiProxy);

// 3. OpenAI (Future proofing)
const openaiProxy = createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/openai': '',
    },
    onProxyReq: (proxyReq, req, res) => {
        const key = process.env.OPENAI_API_KEY;
        if (key) {
            proxyReq.setHeader('Authorization', `Bearer ${key}`);
        }
        console.log(pc.green(`➜ Proxied OpenAI Request: ${req.url}`));
    }
});
app.use('/proxy/openai', openaiProxy);


app.listen(PORT, () => {
    console.log(pc.magenta(`
╔══════════════════════════════════════╗
║   🔒 Universal API Vault Running     ║
║   http://localhost:${PORT}             ║
╚══════════════════════════════════════╝
    `));
    console.log(pc.gray(`Proxying:
    /proxy/anthropic -> https://api.anthropic.com
    /proxy/gemini    -> https://generativelanguage.googleapis.com
    /proxy/openai    -> https://api.openai.com
    `));
});
