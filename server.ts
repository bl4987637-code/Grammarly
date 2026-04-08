import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch and clean web page content
  app.post("/api/fetch-page", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, footer, header, aside, iframe, noscript').remove();
      
      const html = $('body').html() || "";
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(html);
      
      // Clean up markdown (remove excessive newlines)
      const cleanText = markdown.replace(/\n{3,}/g, '\n\n').trim();
      
      res.json({ text: cleanText });
    } catch (error) {
      console.error("Error fetching page:", error);
      res.status(500).json({ error: "Failed to fetch page content" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
