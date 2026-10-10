const { getDBStatus } = require('../config/db');
const { getSystemStatus } = require('../services/convertService');
const env = require('../config/env');

function getHealth(req, res) {
  const dbStatus = getDBStatus();
  const sysStatus = getSystemStatus();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      configured: dbStatus.configured,
      connected: dbStatus.connected,
    },
    system: {
      libreOfficeAvailable: sysStatus.libreOfficeInstalled,
      nodeVersion: sysStatus.nodeVersion,
      platform: sysStatus.platform,
    },
  });
}

function getTools(req, res) {
  const tools = [
    // Category A: PDF Organization
    {
      id: 'merge-pdf',
      name: 'Merge PDF',
      description: 'Combine multiple PDF files into a single unified document in any order.',
      category: 'Organization',
      icon: 'Layers',
      acceptedTypes: ['.pdf'],
      multiple: true,
      popular: true,
      endpoint: '/pdf/merge',
    },
    {
      id: 'split-pdf',
      name: 'Split PDF',
      description: 'Extract specific page ranges or divide a document into multiple files.',
      category: 'Organization',
      icon: 'Scissors',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: true,
      endpoint: '/pdf/split',
    },
    {
      id: 'organize-pdf',
      name: 'Organize PDF',
      description: 'Reorder pages, discard unwanted pages, and structure your PDF perfectly.',
      category: 'Organization',
      icon: 'LayoutGrid',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/organize',
    },
    {
      id: 'rotate-pdf',
      name: 'Rotate PDF',
      description: 'Rotate all or selected pages by 90°, 180°, or 270° clockwise.',
      category: 'Organization',
      icon: 'RotateCw',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: true,
      endpoint: '/pdf/rotate',
    },
    {
      id: 'extract-pages',
      name: 'Extract Pages',
      description: 'Select and export specific pages into a brand new PDF file.',
      category: 'Organization',
      icon: 'FileText',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/extract-pages',
    },

    // Category B: Optimization & Editing
    {
      id: 'compress-pdf',
      name: 'Compress PDF',
      description: 'Reduce file size while preserving high visual quality and typography.',
      category: 'Optimization',
      icon: 'Minimize2',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: true,
      endpoint: '/pdf/compress',
    },
    {
      id: 'add-page-numbers',
      name: 'Add Page Numbers',
      description: 'Insert customizable page numbers with position, style, and typography.',
      category: 'Editing',
      icon: 'Hash',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/page-numbers',
    },
    {
      id: 'add-watermark',
      name: 'Add Watermark',
      description: 'Stamp customized text watermarks with control over opacity, angle, and color.',
      category: 'Editing',
      icon: 'Stamp',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: true,
      endpoint: '/pdf/watermark',
    },
    {
      id: 'protect-pdf',
      name: 'Protect PDF',
      description: 'Encrypt your document with military-grade AES-256 encryption and a strong password.',
      category: 'Security',
      icon: 'Lock',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/protect',
    },
    {
      id: 'unlock-pdf',
      name: 'Unlock PDF',
      description: 'Remove password restrictions from an authorized encrypted PDF document.',
      category: 'Security',
      icon: 'Unlock',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/unlock',
    },

    // Category C: Conversion
    {
      id: 'images-to-pdf',
      name: 'JPG/PNG to PDF',
      description: 'Convert JPG, PNG, and WebP images into a clean, paginated PDF document.',
      category: 'Conversion',
      icon: 'Image',
      acceptedTypes: ['.jpg', '.jpeg', '.png', '.webp'],
      multiple: true,
      popular: true,
      endpoint: '/convert/images-to-pdf',
    },
    {
      id: 'pdf-to-images',
      name: 'PDF to JPG/PNG',
      description: 'Extract every PDF page as high-resolution image files or a ZIP archive.',
      category: 'Conversion',
      icon: 'FileImage',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: true,
      endpoint: '/convert/pdf-to-images',
    },
    {
      id: 'word-to-pdf',
      name: 'Word to PDF',
      description: 'Convert Microsoft Word (.docx) documents into standard PDF format.',
      category: 'Conversion',
      icon: 'FileCode',
      acceptedTypes: ['.docx', '.doc'],
      multiple: false,
      popular: true,
      endpoint: '/convert/word-to-pdf',
    },
    {
      id: 'excel-to-pdf',
      name: 'Excel to PDF',
      description: 'Convert spreadsheets (.xlsx, .xls) into clean, readable PDF tables.',
      category: 'Conversion',
      icon: 'Table',
      acceptedTypes: ['.xlsx', '.xls'],
      multiple: false,
      popular: false,
      endpoint: '/convert/excel-to-pdf',
    },
    {
      id: 'powerpoint-to-pdf',
      name: 'PowerPoint to PDF',
      description: 'Convert presentation slides (.pptx) into accessible PDF documents.',
      category: 'Conversion',
      icon: 'Presentation',
      acceptedTypes: ['.pptx', '.ppt'],
      multiple: false,
      popular: false,
      endpoint: '/convert/powerpoint-to-pdf',
    },

    // Extra Tools
    {
      id: 'pdf-to-text',
      name: 'PDF to Text',
      description: 'Extract raw text from PDF documents for search, indexing, or editing.',
      category: 'Conversion',
      icon: 'AlignLeft',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/to-text',
    },
    {
      id: 'pdf-metadata',
      name: 'Edit PDF Metadata',
      description: 'Inspect and modify title, author, subject, keywords, and document properties.',
      category: 'Editing',
      icon: 'Info',
      acceptedTypes: ['.pdf'],
      multiple: false,
      popular: false,
      endpoint: '/pdf/metadata',
    },
  ];

  res.json({
    success: true,
    count: tools.length,
    tools,
  });
}

function getDetailedStatus(req, res) {
  res.json({
    success: true,
    data: {
      ...getSystemStatus(),
      database: getDBStatus(),
      fileRetentionMinutes: env.FILE_RETENTION_MINUTES,
      maxUploadSizeMb: env.MAX_FILE_SIZE_MB,
    },
  });
}

module.exports = {
  getHealth,
  getTools,
  getDetailedStatus,
};
