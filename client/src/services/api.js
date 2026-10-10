import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 minutes for large file processing
});

// Attach auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('convertx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Standardise error responses
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    return Promise.reject(new Error(message));
  }
);

// ── System ──────────────────────────────────────────────
export const fetchHealth = () => api.get('/health');
export const fetchTools = () => api.get('/tools');
export const fetchStatus = () => api.get('/status');

// ── File Download ────────────────────────────────────────
export const getDownloadUrl = (id) => `${BASE_URL}/files/${id}/download`;
export const getPreviewUrl = (id) => `${BASE_URL}/files/${id}/preview`;

// ── PDF Operations ───────────────────────────────────────
export function mergePdfs(files, order, onProgress) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  if (order) form.append('order', JSON.stringify(order));
  return api.post('/pdf/merge', form, { onUploadProgress: onProgress });
}

export function splitPdf(file, { ranges, splitEvery } = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  if (ranges) form.append('ranges', ranges);
  if (splitEvery) form.append('splitEvery', splitEvery);
  return api.post('/pdf/split', form, { onUploadProgress: onProgress });
}

export function organizePdf(file, { pageOrder, deletedPages } = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  if (pageOrder) form.append('pageOrder', JSON.stringify(pageOrder));
  if (deletedPages) form.append('deletedPages', JSON.stringify(deletedPages));
  return api.post('/pdf/organize', form, { onUploadProgress: onProgress });
}

export function rotatePdf(file, { pages = 'all', angle = 90 } = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  form.append('pages', pages);
  form.append('angle', angle);
  return api.post('/pdf/rotate', form, { onUploadProgress: onProgress });
}

export function extractPages(file, { pages } = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  form.append('pages', pages);
  return api.post('/pdf/extract-pages', form, { onUploadProgress: onProgress });
}

export function compressPdf(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/pdf/compress', form, { onUploadProgress: onProgress });
}

export function addPageNumbers(file, opts = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(opts).forEach(([k, v]) => form.append(k, v));
  return api.post('/pdf/page-numbers', form, { onUploadProgress: onProgress });
}

export function addWatermark(file, opts = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(opts).forEach(([k, v]) => form.append(k, v));
  return api.post('/pdf/watermark', form, { onUploadProgress: onProgress });
}

export function protectPdf(file, { password } = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  form.append('password', password);
  return api.post('/pdf/protect', form, { onUploadProgress: onProgress });
}

export function unlockPdf(file, { password } = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  form.append('password', password);
  return api.post('/pdf/unlock', form, { onUploadProgress: onProgress });
}

export function pdfToText(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/pdf/to-text', form, { onUploadProgress: onProgress });
}

export function getPdfMetadata(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/pdf/metadata/get', form, { onUploadProgress: onProgress });
}

export function updatePdfMetadata(file, meta = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(meta).forEach(([k, v]) => form.append(k, v));
  return api.post('/pdf/metadata/update', form, { onUploadProgress: onProgress });
}

// ── Conversions ──────────────────────────────────────────
export function imagesToPdf(files, opts = {}, onProgress) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  Object.entries(opts).forEach(([k, v]) => form.append(k, v));
  return api.post('/convert/images-to-pdf', form, { onUploadProgress: onProgress });
}

export function pdfToImages(file, opts = {}, onProgress) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(opts).forEach(([k, v]) => form.append(k, v));
  return api.post('/convert/pdf-to-images', form, { onUploadProgress: onProgress });
}

export function wordToPdf(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/convert/word-to-pdf', form, { onUploadProgress: onProgress });
}

export function excelToPdf(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/convert/excel-to-pdf', form, { onUploadProgress: onProgress });
}

export function powerpointToPdf(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/convert/powerpoint-to-pdf', form, { onUploadProgress: onProgress });
}

// ── Auth ─────────────────────────────────────────────────
export const authRegister = (data) => api.post('/auth/register', data);
export const authLogin = (data) => api.post('/auth/login', data);
export const authGetMe = () => api.get('/auth/me');
export const authGetHistory = () => api.get('/auth/history');

export default api;
