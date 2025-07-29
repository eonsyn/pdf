// puppeteer-server/server.js
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static folder (optional)
app.use(express.static(path.join(__dirname, 'public')));
 

// PDF Generation Endpoint
app.post('/generate-pdf-from-html', async (req, res) => {
  try {
    const { html } = req.body;
    const isRender = process.env.RENDER === 'true';

    const browser = await puppeteer.launch({
      headless: 'new',
      ...(isRender
        ? {}
        : {
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
          }),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Wrap HTML with basic styling
    const fullHTML = `
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            @page {
              margin: 40px;
            }
            body {
              font-family: serif;
              margin: 0;
              padding: 0;
            }
            .text-xl { font-size: 1.25rem; }
            .font-bold { font-weight: bold; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .ml-4 { margin-left: 1rem; }
            .ml-5 { margin-left: 1.25rem; }
            .text-green-700 { color: #15803d; }
            .bg-red-700 { background-color: #b91c1c; color: white; padding: 2px 6px; border-radius: 4px; }
            .list-disc { list-style-type: disc; }
            .question { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        bottom: '40px',
        left: '40px',
        right: '40px',
      },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=questions.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Failed to generate PDF');
  }
});
app.get("/",async(req,res)=>{
res.status(200).send("Hello World")
})
// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
