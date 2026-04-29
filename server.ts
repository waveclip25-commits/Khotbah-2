import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Quran Foundation Token Management
  let quranToken: string | null = null;
  let tokenExpiry: number = 0;

  async function getQuranToken() {
    const clientId = process.env.QURAN_CLIENT_ID;
    const clientSecret = process.env.QURAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    if (quranToken && Date.now() < tokenExpiry) {
      return quranToken;
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await fetch('https://oauth2.quran.foundation/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials'
        }),
      });

      if (!response.ok) {
        console.error('Failed to get Quran token:', await response.text());
        return null;
      }

      const data = await response.json();
      quranToken = data.access_token;
      // Set expiry slightly earlier than actual expiry (usually 1 hour)
      tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return quranToken;
    } catch (error) {
      console.error('Error fetching Quran token:', error);
      return null;
    }
  }

  // API Route for Quran.com Proxy
  app.get("/api/quran-proxy/*", async (req, res) => {
    const apiPath = req.params[0];
    const queryParams = new URLSearchParams(req.query as any).toString();
    const apiUrl = `https://api.quran.com/api/v4/${apiPath}?${queryParams}`;

    try {
      const headers: HeadersInit = {};
      const token = await getQuranToken();
      
      if (token) {
        headers['x-auth-token'] = token;
        headers['x-client-id'] = process.env.QURAN_CLIENT_ID || '';
      }

      const response = await fetch(apiUrl, { headers });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Quran proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from Quran.com" });
    }
  });

  // API Route for External Proxy (to avoid CORS and provide reliability)
  app.get("/api/external-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`External source returned ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      if (contentType) res.setHeader('Content-Type', contentType);
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("External proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from external source", details: error.message });
    }
  });

  // API Route for Proxy Download (Improved for Google Drive)
  app.get("/api/proxy-download", async (req, res) => {
    const fileId = req.query.id as string;
    if (!fileId) {
      return res.status(400).json({ error: "Missing file ID" });
    }

    // Attempt direct download first, then try with confirmation token if needed
    let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    try {
      let response = await fetch(downloadUrl);
      
      // Handle Google Drive virus scan warning (which returns a 200 with a confirmation form)
      const text = await response.clone().text();
      if (text.includes('confirm=') && text.includes('download')) {
        const confirmMatch = text.match(/confirm=([a-zA-Z0-9_]+)/);
        if (confirmMatch) {
          const confirmToken = confirmMatch[1];
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
          response = await fetch(downloadUrl);
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch from Drive: ${response.statusText}`);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="book-${fileId}.json"`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();

    } catch (error: any) {
      console.error("Proxy download error:", error);
      res.status(500).json({ error: "Failed to download file", details: error.message });
    }
  });

  // API Route for Hadith API Proxy
  app.get("/api/hadith-proxy/*", async (req, res) => {
    const apiPath = req.params[0];
    const queryParams = new URLSearchParams(req.query as any).toString();
    const apiUrl = `https://api.hadith.sutanlab.id/${apiPath}?${queryParams}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Hadith proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from Hadith API" });
    }
  });

  // API Route for EQuran Tafsir Proxy
  app.get("/api/equran-tafsir-proxy/:id", async (req, res) => {
    const id = req.params.id;
    const apiUrl = `https://equran.id/api/v2/tafsir/${id}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("EQuran Tafsir proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from EQuran API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.join(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
