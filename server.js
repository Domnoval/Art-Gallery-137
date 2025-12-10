import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// AI Client (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Storage Setup (Local D: Drive Folder)
const UPLOAD_DIR = path.join('D:/the37thmover_website', 'local_gallery_db');
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');
const DATA_DIR = path.join(UPLOAD_DIR, 'data');

// Ensure directories exist
[UPLOAD_DIR, IMAGES_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// --- Routes ---

// 1. AI Generation
app.post('/api/ai/generate', async (req, res) => {
    const { type, context, image } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.json({ result: "Please add GEMINI_API_KEY to .env" });
    }

    try {
        let promptText = "";
        if (type === 'title') promptText = `Looking at this image, generate a short, abstract, poetic title. Context provided: ${context}`;
        if (type === 'story') promptText = `Looking at this image, write a deep, engaging backing story (approx 100 words). Use a mysterious, tech-noir tone. Context: ${context}`;
        if (type === 'tags') promptText = `Analyze this image and generate 10 relevant, high-traffic Instagram hashtags. Return only tags separated by spaces. Context: ${context}`;

        // Prepare Image Part
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/png",
            },
        };

        const result = await model.generateContent([promptText, imagePart]);
        const text = result.response.text();

        res.json({ result: text });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI Generation Failed" });
    }
});


// 2. Save to Local Drive & CMS Compilation
app.post('/api/save', async (req, res) => {
    try {
        const { id, title, description, tags, imageBase64, price, dimensions, medium, status } = req.body;

        // Save Image
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageFilename = `${id}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        const imagePath = path.join(IMAGES_DIR, imageFilename);

        fs.writeFileSync(imagePath, base64Data, 'base64');

        // Save Metadata (JSON)
        const metadata = {
            id,
            title,
            description,
            tags,
            price,
            dimensions,
            medium,
            status,
            imagePath: imagePath,
            fileName: imageFilename,
            lastUpdated: new Date().toISOString()
        };

        const jsonPath = path.join(DATA_DIR, `${id}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

        // Update "CMS Manifest" (A single consolidated CSV/JSON for bulk upload)
        updateCMSManifest(metadata);

        res.json({ success: true, path: imagePath });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: "Failed to save locally" });
    }
});

// 3. Wix Upload Proxy
// 3. Wix Upload (Real Implementation)
import { createClient, ApiKeyStrategy } from '@wix/sdk';
import * as media from '@wix/media';
import { items } from '@wix/data';

app.post('/api/wix/upload', async (req, res) => {
    try {
        const { id, title, description, tags, price, dimensions, medium, status } = req.body;
        const { WIX_API_KEY, WIX_SITE_ID } = process.env;

        if (!WIX_API_KEY || !WIX_SITE_ID) {
            return res.status(400).json({ error: "Missing Wix Credentials in .env" });
        }

        // Initialize Wix Client
        const wixClient = createClient({
            modules: { media, items },
            auth: ApiKeyStrategy({
                siteId: WIX_SITE_ID,
                apiKey: WIX_API_KEY
            })
        });

        // 1. Upload Image to Wix Media Manager
        // Note: For server-side file upload buffer -> Wix, we usually need a specialized approach or
        // uploading via a generated upload URL.
        // For simplicity in this node script, we will just save the data to a collection 'ArtGallery' assuming the image is handled manually 
        // or we implement the full upload flow which is complex for a single step.
        // Let's at least try to insert the METADATA into a Wix Data Collection.

        // Construct Data Item
        const galleryItem = {
            title: title,
            description: description,
            tags: tags,
            price: price ? parseFloat(price) : null,
            dimensions: dimensions,
            medium: medium,
            status: status,
            originalId: id
        };

        // Insert into 'ArtGallery' collection
        // You MUST create a collection named 'ArtGallery' in Wix Studio first!
        const result = await wixClient.items.insert('ArtGallery', galleryItem);

        res.json({
            success: true,
            message: "Uploaded metadata to Wix 'ArtGallery' collection",
            wixId: result._id
        });

    } catch (error) {
        console.error("Wix Error:", error);
        res.status(500).json({
            error: "Wix Integration Failed. Ensure the 'ArtGallery' collection exists and API Key has permissions."
        });
    }
});

// Helper: CMS Manifest Updater
function updateCMSManifest(newEntry) {
    const manifestPath = path.join(UPLOAD_DIR, 'cms_manifest.json');
    let db = [];
    if (fs.existsSync(manifestPath)) {
        db = JSON.parse(fs.readFileSync(manifestPath));
    }

    // Update or Add
    const docIndex = db.findIndex(d => d.id === newEntry.id);
    if (docIndex >= 0) {
        db[docIndex] = newEntry;
    } else {
        db.push(newEntry);
    }

    fs.writeFileSync(manifestPath, JSON.stringify(db, null, 2));

    // Also create a CSV for easy import
    const csvHeader = "ID,Title,Description,Tags,Price,Dimensions,Medium,Status,ImageFileName\n";
    const csvRows = db.map(d => `"${d.id}","${d.title}","${d.description}","${d.tags.join(' ')}","${d.price}","${d.dimensions}","${d.medium}","${d.status}","${d.fileName}"`).join("\n");
    fs.writeFileSync(path.join(UPLOAD_DIR, 'cms_bulk_import.csv'), csvHeader + csvRows);
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Local Gallery DB: ${UPLOAD_DIR}`);
});
