// server.js (Playwright version)
import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright'; // Install with: npm install playwright
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate-pdf-from-html', async (req, res) => {
  try {
    const { html } = req.body;

    const browser = await chromium.launch(); // headless by default
    const page = await browser.newPage();

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
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHTML, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      printBackground: true
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=answers.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).send('Failed to generate PDF');
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
