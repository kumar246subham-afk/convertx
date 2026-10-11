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
  });

  describe('Document Conversions', () => {
    it('POST /api/v1/convert/word-to-pdf converts DOCX with unicode and tables successfully', async () => {
      const fs = require('fs');
      const path = require('path');
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
    });

    it('POST /api/v1/convert/word-to-pdf rejects request without file', async () => {
      const res = await request(app).post('/api/v1/convert/word-to-pdf');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('File Downloads & Lifecycle', () => {
    it('GET /api/v1/files/:id/download successfully streams created file', async () => {
      // First create a file
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
});
