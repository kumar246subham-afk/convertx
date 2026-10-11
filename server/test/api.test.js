const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const app = require('../src/app');
const fileService = require('../src/services/fileService');

describe('ConvertX Backend API Test Suite', () => {
  let samplePdfBuffer;
  let sampleMultiPagePdfBuffer;

  before(async () => {
    // Generate valid 1-page PDF fixture with embedded text
    const doc1 = await PDFDocument.create();
    const font = await doc1.embedFont(StandardFonts.Helvetica);
    const p1 = doc1.addPage([200, 200]);
    p1.drawText('ConvertX Sample PDF Content', { x: 20, y: 100, font, size: 12 });
    samplePdfBuffer = Buffer.from(await doc1.save({ useObjectStreams: false }));

    // Generate valid 3-page PDF fixture
    const doc3 = await PDFDocument.create();
    doc3.addPage([200, 200]);
    doc3.addPage([200, 200]);
    doc3.addPage([200, 200]);
    sampleMultiPagePdfBuffer = Buffer.from(await doc3.save());
  });

  describe('System Endpoints', () => {
    it('GET /api/v1/health returns healthy status', async () => {
      const res = await request(app).get('/api/v1/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'healthy');
      assert.ok(res.body.timestamp);
    });

    it('GET /api/v1/tools returns list of at least 15 tools', async () => {
      const res = await request(app).get('/api/v1/tools');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.tools));
      assert.ok(res.body.tools.length >= 15);
    });

    it('OPTIONS /api/v1/auth/login allows CORS preflight for localhost:5174 and 127.0.0.1:5174', async () => {
      for (const origin of ['http://localhost:5174', 'http://127.0.0.1:5174']) {
        const res = await request(app)
          .options('/api/v1/auth/login')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', 'content-type,authorization');

        assert.strictEqual(res.status, 204);
        assert.strictEqual(res.headers['access-control-allow-origin'], origin);
      }
    });

    it('POST /api/v1/auth/login responds with proper CORS headers and validation from port 5174', async () => {
      for (const origin of ['http://localhost:5174', 'http://127.0.0.1:5174']) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('Origin', origin)
          .send({});

        assert.strictEqual(res.headers['access-control-allow-origin'], origin);
        assert.ok([400, 503].includes(res.status));
        assert.strictEqual(res.body.success, false);
      }
    });
  });

  describe('PDF Operations', () => {
    it('POST /api/v1/pdf/merge combines 2 PDFs successfully', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/merge')
        .attach('files', samplePdfBuffer, 'doc1.pdf')
        .attach('files', samplePdfBuffer, 'doc2.pdf');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
      assert.strictEqual(res.body.data.pageCount, 2);
    });

    it('POST /api/v1/pdf/merge rejects when fewer than 2 files provided', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/merge')
        .attach('files', samplePdfBuffer, 'single.pdf');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('POST /api/v1/pdf/split extracts valid page range', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/split')
        .attach('file', sampleMultiPagePdfBuffer, 'multipage.pdf')
        .field('ranges', '1-2');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
      assert.strictEqual(res.body.data.pageCount, 2);
    });

    it('POST /api/v1/pdf/split rejects out-of-bounds page range', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/split')
        .attach('file', sampleMultiPagePdfBuffer, 'multipage.pdf')
        .field('ranges', '1-10');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /exceeds document page count/i);
    });

    it('POST /api/v1/pdf/rotate rotates pages successfully', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/rotate')
        .attach('file', samplePdfBuffer, 'rotate-me.pdf')
        .field('angle', 90)
        .field('pages', 'all');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
    });

    it('POST /api/v1/pdf/protect encrypts document with password', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/protect')
        .attach('file', samplePdfBuffer, 'secret.pdf')
        .field('password', 'securePass123');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
    });

    it('POST /api/v1/pdf/watermark applies watermark to document', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/watermark')
        .attach('file', samplePdfBuffer, 'watermark.pdf')
        .field('text', 'TOP SECRET')
        .field('opacity', 0.5);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
    });

    it('POST /api/v1/pdf/compress reduces or optimizes document size', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/compress')
        .attach('file', samplePdfBuffer, 'compress.pdf');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
      assert.ok(res.body.data.reductionPercent);
    });

    it('POST /api/v1/pdf/to-text extracts text successfully', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/to-text')
        .attach('file', samplePdfBuffer, 'sample.pdf');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
    });

    it('POST /api/v1/pdf/organize reorders and deletes pages using comma-separated strings', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/organize')
        .attach('file', sampleMultiPagePdfBuffer, 'organize.pdf')
        .field('pageOrder', JSON.stringify('3,2,1'))
        .field('deletedPages', JSON.stringify('2'));

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pageCount, 2);
    });

    it('POST /api/v1/pdf/extract-pages extracts selected pages into a valid PDF', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/extract-pages')
        .attach('file', sampleMultiPagePdfBuffer, 'extract.pdf')
        .field('pages', '1, 3');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pageCount, 2);
    });

    it('POST /api/v1/pdf/page-numbers adds formatted page numbers to all pages', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/page-numbers')
        .attach('file', sampleMultiPagePdfBuffer, 'numbers.pdf')
        .field('position', 'bottom-center')
        .field('fontSize', '10')
        .field('startNumber', '1')
        .field('format', 'Page {n} of {total}');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pageCount, 3);
    });

    it('POST /api/v1/pdf/unlock decrypts a password-protected PDF', async () => {
      const resProtect = await request(app)
        .post('/api/v1/pdf/protect')
        .attach('file', samplePdfBuffer, 'lock-me.pdf')
        .field('password', 'unitTestPass99');
      assert.strictEqual(resProtect.status, 200);

      const dlProtect = await request(app)
        .get(`/api/v1/files/${resProtect.body.data.downloadId}/download`)
        .buffer(true)
        .parse((res, cb) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      const resUnlock = await request(app)
        .post('/api/v1/pdf/unlock')
        .attach('file', dlProtect.body, 'protected.pdf')
        .field('password', 'unitTestPass99');

      assert.strictEqual(resUnlock.status, 200);
      assert.strictEqual(resUnlock.body.success, true);
      assert.ok(resUnlock.body.data.downloadId);
    });

    it('POST /api/v1/pdf/metadata/get and /update reads and updates PDF metadata', async () => {
      const resUpdate = await request(app)
        .post('/api/v1/pdf/metadata/update')
        .attach('file', samplePdfBuffer, 'meta.pdf')
        .field('title', 'ConvertX Audit Title')
        .field('author', 'ConvertX QA');

      assert.strictEqual(resUpdate.status, 200);
      assert.strictEqual(resUpdate.body.success, true);

      const dlMeta = await request(app)
        .get(`/api/v1/files/${resUpdate.body.data.downloadId}/download`)
        .buffer(true)
        .parse((res, cb) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      const resGet = await request(app)
        .post('/api/v1/pdf/metadata/get')
        .attach('file', dlMeta.body, 'updated-meta.pdf');

      assert.strictEqual(resGet.status, 200);
      assert.strictEqual(resGet.body.data.title, 'ConvertX Audit Title');
      assert.strictEqual(resGet.body.data.author, 'ConvertX QA');
    });
  });

  describe('Document Conversions', () => {
    it('POST /api/v1/convert/word-to-pdf converts DOCX with unicode and tables and produces valid downloadable PDF', async () => {
      const fs = require('fs');
      const path = require('path');
      const pdfParse = require('pdf-parse');
      const fixturePath = path.resolve(__dirname, 'fixtures/test-sample.docx');
      assert.ok(fs.existsSync(fixturePath), 'test fixture exists');
      const buffer = fs.readFileSync(fixturePath);

      const res = await request(app)
        .post('/api/v1/convert/word-to-pdf')
        .attach('file', buffer, 'test-sample.docx');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
      assert.ok(res.body.data.size > 0);
      assert.ok(res.body.data.pageCount >= 1);
      assert.match(res.body.data.filename, /\.pdf$/i);

      // Download and verify the generated PDF opens and contains expected document text
      const dlRes = await request(app)
        .get(`/api/v1/files/${res.body.data.downloadId}/download`)
        .buffer(true)
        .parse((r, cb) => {
          const chunks = [];
          r.on('data', (c) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      assert.strictEqual(dlRes.status, 200);
      const loadedPdf = await PDFDocument.load(dlRes.body);
      assert.ok(loadedPdf.getPageCount() >= 1);
      const parsedText = await pdfParse(dlRes.body);
      assert.ok(parsedText.text.length > 0, 'Generated PDF contains extracted text');
    });

    it('POST /api/v1/convert/word-to-pdf rejects request without file', async () => {
      const res = await request(app).post('/api/v1/convert/word-to-pdf');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('POST /api/v1/convert/images-to-pdf converts PNG image to valid PDF', async () => {
      const sharp = require('sharp');
      const pngBuffer = await sharp({
        create: { width: 120, height: 80, channels: 3, background: { r: 124, g: 58, b: 237 } },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .post('/api/v1/convert/images-to-pdf')
        .attach('files', pngBuffer, 'sample.png')
        .field('margin', '20');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pageCount, 1);
    });

    it('POST /api/v1/convert/pdf-to-images renders PDF page to PNG image', async () => {
      const res = await request(app)
        .post('/api/v1/convert/pdf-to-images')
        .attach('file', samplePdfBuffer, 'render.pdf')
        .field('format', 'png')
        .field('dpi', '72');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.downloadId);
      assert.match(res.body.data.filename, /\.png$/i);
    });

    it('POST /api/v1/convert/excel-to-pdf converts XLSX with unicode characters to valid PDF', async () => {
      const xlsx = require('xlsx');
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([
        ['Item', 'Price (₹)', 'Notes'],
        ['ConvertX Pro \uF0AE', '₹999', 'Tab\ttest & smart “quotes”'],
      ]);
      xlsx.utils.book_append_sheet(wb, ws, 'Pricing ₹');
      const xlsxBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/v1/convert/excel-to-pdf')
        .attach('file', xlsxBuffer, 'pricing.xlsx');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pageCount, 1);
    });

    it('Linux Pure-Node Word-to-PDF fallback (convertWithMammothPdfLib) converts DOCX with Unicode 0xF0AE and tables to a valid PDF', async () => {
      const fs = require('fs');
      const path = require('path');
      const { convertWithMammothPdfLib } = require('../src/services/convertService');
      const { extractText } = require('../src/services/pdfService');
      const { safeDelete } = require('../src/utils/helpers');

      const fixturePath = path.resolve(__dirname, 'fixtures/test-sample.docx');
      const outPath = path.resolve(__dirname, 'fixtures/temp-linux-fallback-word.pdf');
      let extractedPath = null;

      try {
        await convertWithMammothPdfLib(
          { path: fixturePath, originalname: 'test-sample.docx' },
          outPath
        );
        assert.ok(fs.existsSync(outPath), 'Fallback PDF file was created');
        const pdfBytes = fs.readFileSync(outPath);
        const doc = await PDFDocument.load(pdfBytes);
        assert.ok(doc.getPageCount() >= 1, 'Fallback PDF has at least 1 page');
        const extracted = await extractText({ path: outPath, originalname: 'test-sample.pdf' });
        extractedPath = extracted.outputPath;
        assert.ok(extracted.text.includes('ConvertX'), 'Fallback PDF contains extracted document text');
      } finally {
        safeDelete(outPath);
        if (extractedPath) safeDelete(extractedPath);
      }
    });

    it('Linux Pure-Node PowerPoint-to-PDF fallback (convertWithPptxPdfLib) converts PPTX slides with Unicode to a valid widescreen PDF', async () => {
      const fs = require('fs');
      const path = require('path');
      const JSZip = require('jszip');
      const { convertWithPptxPdfLib } = require('../src/services/convertService');
      const { extractText } = require('../src/services/pdfService');
      const { safeDelete } = require('../src/utils/helpers');

      const pptxPath = path.resolve(__dirname, 'fixtures/temp-sample.pptx');
      const outPath = path.resolve(__dirname, 'fixtures/temp-linux-fallback-ppt.pdf');
      let extractedPath = null;

      try {
        const zip = new JSZip();
        zip.file(
          'ppt/slides/slide1.xml',
          '<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>ConvertX Architecture Overview</a:t></a:r></a:p><a:p><a:r><a:t>\uF0AE Multi-tier conversion engine &amp; cloud readiness</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>'
        );
        zip.file(
          'ppt/slides/slide2.xml',
          '<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide Two Summary</a:t></a:r></a:p><a:p><a:r><a:t>Tab\tsupport and smart “quotes” on Linux</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>'
        );
        const pptxBuf = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(pptxPath, pptxBuf);

        await convertWithPptxPdfLib({ path: pptxPath, originalname: 'sample.pptx' }, outPath);
        assert.ok(fs.existsSync(outPath), 'PPTX fallback PDF was created');
        const pdfBytes = fs.readFileSync(outPath);
        const doc = await PDFDocument.load(pdfBytes);
        assert.strictEqual(doc.getPageCount(), 2, 'Generated 2-page PDF for 2 slides');
        const extracted = await extractText({ path: outPath, originalname: 'sample.pdf' });
        extractedPath = extracted.outputPath;
        assert.ok(extracted.text.includes('ConvertX Architecture Overview'));
      } finally {
        safeDelete(pptxPath);
        safeDelete(outPath);
        if (extractedPath) safeDelete(extractedPath);
      }
    });
  });

  describe('Upload Validation & File Downloads', () => {
    it('Rejects unsupported file extension with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/pdf/rotate')
        .attach('file', Buffer.from('fake-executable'), 'malware.exe');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Unsupported file type/i);
    });

    it('GET /api/v1/files/:id/download successfully streams created file', async () => {
      const resCreate = await request(app)
        .post('/api/v1/pdf/rotate')
        .attach('file', samplePdfBuffer, 'stream.pdf')
        .field('angle', 180);

      const downloadId = resCreate.body.data.downloadId;

      const resDownload = await request(app).get(`/api/v1/files/${downloadId}/download`);
      assert.strictEqual(resDownload.status, 200);
      assert.strictEqual(resDownload.headers['content-type'], 'application/pdf');
    });

    it('GET /api/v1/files/:id/download returns 404 for invalid/expired ID', async () => {
      const res = await request(app).get('/api/v1/files/non-existent-id/download');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'FILE_EXPIRED_OR_NOT_FOUND');
    });
  });

  describe('Authentication & Conversion History', () => {
    it('Registers a test user, logs in, verifies /auth/me, and records conversion history in /auth/history', async () => {
      const { connectDB, getDBStatus } = require('../src/config/db');
      const User = require('../src/models/User');
      const JobHistory = require('../src/models/JobHistory');

      await connectDB();
      if (!getDBStatus().connected) {
        return; // Skip DB-dependent auth lifecycle only if MongoDB is not running
      }

      const testEmail = `qa-audit-${Date.now()}@convertx.local`;
      const testPassword = 'SafeAuditPassword123!';

      try {
        // 1. Register
        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({ name: 'QA Auditor', email: testEmail, password: testPassword });
        assert.strictEqual(regRes.status, 201);
        assert.strictEqual(regRes.body.success, true);
        assert.ok(regRes.body.data.token);

        // 2. Login
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: testEmail, password: testPassword });
        assert.strictEqual(loginRes.status, 200);
        assert.strictEqual(loginRes.body.success, true);
        const token = loginRes.body.data.token;

        // 3. Get profile (/auth/me)
        const meRes = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(meRes.status, 200);
        assert.strictEqual(meRes.body.data.email, testEmail);

        // 4. Perform an authenticated PDF operation
        const opRes = await request(app)
          .post('/api/v1/pdf/compress')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', samplePdfBuffer, 'history-check.pdf');
        assert.strictEqual(opRes.status, 200);

        // Wait briefly for async JobHistory write
        await new Promise((r) => setTimeout(r, 150));

        // 5. Verify conversion history (/auth/history)
        const histRes = await request(app)
          .get('/api/v1/auth/history')
          .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(histRes.status, 200);
        assert.ok(Array.isArray(histRes.body.data));
        assert.ok(histRes.body.data.some((h) => h.originalFilename === 'history-check.pdf'));
      } finally {
        const mongoose = require('mongoose');
        const user = await User.findOne({ email: testEmail });
        if (user) {
          await JobHistory.deleteMany({ userId: user._id });
          await User.deleteOne({ _id: user._id });
        }
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
      }
    });
  });
});
