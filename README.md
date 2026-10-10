# ConvertX — Complete PDF Tools Web Application

ConvertX is a modern, privacy-first, full-stack PDF toolkit inspired by the usability of Smallpdf and iLovePDF. It provides **17 document manipulation and conversion tools** with real backend file processing, progress tracking, responsive layouts, and zero permanent file storage.

---

## 🌟 Key Features

- **17 Functional Document Tools**: Merge, split, organize, rotate, extract pages, compress, watermark, page numbers, protect, unlock, PDF to text, metadata editor, and conversions (JPG/PNG to PDF, PDF to Images, Word to PDF, Excel to PDF, PowerPoint to PDF).
- **Real File Processing**: Powered by `pdf-lib`, `sharp`, `pdf-to-png-converter`, `mammoth`, and `xlsx`. No fake buttons or mocked downloads.
- **Privacy & Security by Design**:
  - Ephemeral processing with an automatic background cleanup daemon (files deleted after 30 minutes).
  - AES-256 standard encryption for password-protected PDFs.
  - Encryption passwords are never stored in databases, logs, or local storage.
  - Zero forced accounts — anonymous usage supported for all core features.
- **Modern Responsive UI**: Built with React 18, Vite, Tailwind CSS, and Lucide React.
- **Unified Monorepo Workflow**: Single root command runs both client and server concurrently.

---

## 📁 Project Architecture

```
convertx/
├── client/                     # Frontend (React 18 + Vite + Tailwind CSS)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Navbar, Footer, ToolCard, UploadZone, FilePreview,
│   │   │                       # ProgressIndicator, ResultPanel, ErrorMessage
│   │   ├── config/             # tools.js (Tool configurations, options, metadata)
│   │   ├── pages/              # Home, AllTools, ToolPage, About, Privacy, Contact,
│   │   │                       # Login, Register, NotFound
│   │   ├── services/           # api.js (Axios REST client with progress tracking)
│   │   ├── utils/              # format.js (Human-readable byte & name formatting)
│   │   ├── App.jsx             # Router layout & page definitions
│   │   ├── main.jsx            # Entry point with Toaster & BrowserRouter
│   │   └── index.css           # Tailwind directives & glassmorphism utilities
│   ├── index.html              # HTML shell & font imports
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Backend (Node.js + Express REST API)
│   ├── src/
│   │   ├── config/             # env.js, db.js (Optional MongoDB integration)
│   │   ├── controllers/        # pdfController, convertController, fileController,
│   │   │                       # systemController, authController
│   │   ├── middleware/         # upload.js (Multer), errorHandler, rateLimiter, auth
│   │   ├── models/             # User.js, JobHistory.js (Mongoose schemas)
│   │   ├── routes/             # pdfRoutes, convertRoutes, fileRoutes, systemRoutes, authRoutes
│   │   ├── services/           # pdfService, convertService, fileService, cleanupService
│   │   ├── utils/              # validators, helpers, errors
│   │   ├── app.js              # Express app with helmet, cors, and rate limiting
│   │   └── server.js           # Server bootstrap & background cleanup job
│   ├── test/                   # api.test.js (13 automated integration tests)
│   ├── uploads/                # Ephemeral upload storage (auto-cleaned)
│   ├── processed/              # Ephemeral output storage (auto-cleaned)
│   └── package.json
│
├── package.json                # Root monorepo orchestrator (concurrently)
├── .gitignore
└── README.md
```

---

## 🛠️ Supported Tools

| # | Tool | Slug | Input Formats | Description |
|---|---|---|---|---|
| 1 | **Merge PDF** | `merge-pdf` | `.pdf` (Multiple) | Combine multiple PDFs into a single document in custom order |
| 2 | **Split PDF** | `split-pdf` | `.pdf` | Extract specific page ranges or split every N pages into a ZIP |
| 3 | **Organize PDF** | `organize-pdf` | `.pdf` | Reorder pages and delete unwanted pages |
| 4 | **Rotate PDF** | `rotate-pdf` | `.pdf` | Rotate all or specific pages by 90°, 180°, or 270° |
| 5 | **Extract Pages** | `extract-pages` | `.pdf` | Create a new PDF containing only chosen pages |
| 6 | **Compress PDF** | `compress-pdf` | `.pdf` | Optimize document structure and report before/after sizes |
| 7 | **Add Page Numbers** | `add-page-numbers` | `.pdf` | Add custom page numbers with positioning and format control |
| 8 | **Add Watermark** | `add-watermark` | `.pdf` | Stamp diagonal watermark text with opacity and color options |
| 9 | **Protect PDF** | `protect-pdf` | `.pdf` | Encrypt PDF using industry-standard AES-256 encryption |
| 10 | **Unlock PDF** | `unlock-pdf` | `.pdf` | Decrypt a password-protected PDF when password is provided |
| 11 | **Images to PDF** | `images-to-pdf` | `.jpg`, `.png`, `.webp` | Convert multiple images into a clean, paginated PDF |
| 12 | **PDF to Images** | `pdf-to-images` | `.pdf` | Render PDF pages to high-res PNG or JPEG (returns ZIP for multi-page) |
| 13 | **Word to PDF** | `word-to-pdf` | `.docx`, `.doc` | Convert Microsoft Word documents to PDF |
| 14 | **Excel to PDF** | `excel-to-pdf` | `.xlsx`, `.xls` | Convert spreadsheet worksheets to printable landscape PDF tables |
| 15 | **PowerPoint to PDF** | `powerpoint-to-pdf` | `.pptx`, `.ppt` | Convert presentation slides to PDF (requires LibreOffice on server) |
| 16 | **PDF to Text** | `pdf-to-text` | `.pdf` | Extract embedded digital text with preview and TXT download |
| 17 | **Edit Metadata** | `pdf-metadata` | `.pdf` | View and edit PDF Title, Author, Subject, and Keywords |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- *(Optional)* **LibreOffice** for native PPTX/DOCX headless conversion.
- *(Optional)* **MongoDB** for persistent user accounts and history (anonymous users work without MongoDB).

### 1. Installation

From the project root:

```bash
# Install root orchestrator dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Return to root
cd ..
```

Or run the convenient root helper:
```bash
npm run install:all
```

---

### 2. Environment Configuration

#### Backend (`server/.env`):
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=25
FILE_RETENTION_MINUTES=30
JWT_SECRET=convertx-super-secret-jwt-key-2026
# Optional MongoDB URI:
# MONGO_URI=mongodb://localhost:27017/convertx
```

#### Frontend (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

### 3. Running the Project

#### Running Both Frontend and Backend Concurrently (Recommended):
From the root directory:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

#### Running Independently:
```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:client
```

---

### 4. Running Backend Tests

The backend includes 13 automated tests covering health checks, tool metadata, file operations, error boundaries, and download registries:

```bash
npm test
```

---

### 5. Production Build

To compile the React frontend for production:
```bash
npm run build
```
The optimized static build will be generated in `client/dist/`.

---

## 🔒 Security & File Privacy Details

1. **UUID-based Registry**: When a file is processed, it is assigned a random UUID download ID. Raw filesystem paths are never exposed to the client.
2. **Automated Ephemeral Lifecycle**: A periodic cleanup service checks the `uploads/` and `processed/` folders every 5 minutes and permanently deletes files older than 30 minutes.
3. **Password Privacy**: Passwords submitted to `protect-pdf` or `unlock-pdf` are used exclusively in ephemeral process memory and are never persisted.
4. **Input Sanitization**: File names are sanitized to prevent directory traversal attacks, and Multer enforces file extension and MIME type allowlists.

---

## 📄 License

This project is licensed under the MIT License.
