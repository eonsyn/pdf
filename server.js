// puppeteer-server/server.js
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import bodyParser from 'body-parser';
import katex from 'katex'; 
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate-pdf', async (req, res) => {
  const { subject, chapterTitle, questions } = req.body;

  if (!questions || !subject || !chapterTitle) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  const html = generateHTML(subject, chapterTitle, questions);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  });

  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="booklet.pdf"',
  });

  res.send(pdfBuffer);
});

function renderKaTeX(latex) {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false, // inline math
    });
  } catch {
    return `<span style="color:red">Invalid LaTeX: ${latex}</span>`;
  }
}

function decodeHTMLEntities(text) {
  return text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
             .replace(/&nbsp;/g, ' ')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&')
             .replace(/&quot;/g, '"')
             .replace(/&apos;/g, "'");
}

function processLaTeX(text) {
  const latexRegex = /(\$\$[^\$]*\$\$|\$[^\$]*\$)/g;
  const decoded = decodeHTMLEntities(text?.trim() || '');
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = latexRegex.exec(decoded)) !== null) {
    const matchIndex = match.index;

    result += decoded.substring(lastIndex, matchIndex);

    const rawLatex = match[0].replace(/^\$\$?|\$\$?$/g, '');
    const isBlock = match[0].startsWith('$$');

    const rendered = katex.renderToString(rawLatex, {
      throwOnError: false,
      displayMode: isBlock,
    });

    result += rendered;
    lastIndex = latexRegex.lastIndex;
  }

  result += decoded.substring(lastIndex);
  return result;
}

function generateHTML(subject, chapterTitle, questions) {
  const questionHTML = questions
    .map((q, i) => {
      const qText = processLaTeX(q.question.text);
      const optionsHTML = q.options
        ?.map(
          (opt, j) =>
            `<p style="margin-left:20px">(${String.fromCharCode(
              65 + j
            )}) ${processLaTeX(opt.text)}</p>`
        )
        .join('');
      return `<div style="margin-bottom: 15px;">
        <p><strong>Q${i + 1}.</strong> ${qText}</p>
        ${optionsHTML}
      </div>`;
    })
    .join('');

  return `
    <html>
      <head>
        <title>${subject} - ${chapterTitle}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <style>
          body { font-family: serif; padding: 40px; }
          h1, h3 { text-align: center; }
          .footer { text-align: center; margin-top: 40px; color: gray; }
          .katex { font-size: 1.1em; }
        </style>
      </head>
      <body>
        <h1>${subject} - ${chapterTitle}</h1>
        <h3>Time: 1 Hour</h3>
        ${questionHTML}
        <div class="footer">© Aryan EdTech – All Rights Reserved</div>
      </body>
    </html>
  `;
}

app.post("/generate-pdf-from-html", async (req, res) => {
  const { html } = req.body;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setContent(`
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

          .question {
            margin-bottom: 20px;
          }

          .question p {
            margin: 4px 0;
          }

          .header {
            margin-bottom: 20px;
            font-weight: bold;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '40px',
      bottom: '40px',
      left: '40px',
      right: '40px'
    }
  });

  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=questions.pdf");
  res.send(pdfBuffer);
});


app.listen(4000, () => console.log('Server running on http://localhost:4000'));
