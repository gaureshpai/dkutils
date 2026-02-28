# 🛠️ dkutils — The Ultimate Multi-Utility Platform

**Version:** 2.0.2

![dkutils Logo](frontend/public/logo.png)

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Vite](https://img.shields.io/badge/Frontend-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Turbo](https://img.shields.io/badge/Monorepo-Turbo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)

**dkutils** is a powerful, modern web-based utility platform that provides a comprehensive suite of everyday tools in one unified interface. From image manipulation and PDF processing to text utilities and web development tools, dkutils simplifies your digital workflow.

---

## 🚀 Key Features

### 🖼️ Image Tools

- **Conversion**: JPG, PNG, WebP, TIFF, AVIF, and Base64.
- **Manipulation**: Compress, Resize, Crop, Grayscale, Flip.
- **Batch Processing**: Convert multiple images to a single PDF.

### 📄 PDF Tools

- **Management**: Merge, Split, Rotate, Delete pages.
- **Cloud Storage**: Seamless integration with Supabase for secure processing.
- **Conversion**: PDF to Text, PDF to Word/Excel, Text to PDF.

### ✍️ Text Utilities

- **Converters**: Case conversion, Base64, HTML/Markdown, CSV to JSON.
- **Analysis**: Diff Checker, JSON Validator, Password Strength.
- **Security**: Strong Password Generator & Hash Generator (MD5, SHA).

### 🌐 Web Tools

- **SEO & Analysis**: Robots.txt/Sitemap viewer, URL Redirect Checker.
- **Generators**: Link Shortener, QR Code Generator & Scanner.
- **Capture**: Website Screenshot Generator & Favicon Extractor.

---

## 💻 Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Backend**: [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Meta-data), [Supabase](https://supabase.com/) (File Storage)
- **Monorepo Management**: [Turborepo](https://turbo.build/)
- **Utilities**: [Sharp](https://sharp.pixelplumbing.com/) (Image handling), [PDF-lib](https://pdf-lib.js.org/) (PDF manipulation)

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v10+)
- MongoDB instance (local or Atlas)
- Supabase Account (for API keys)

### Environment Setup

1. **Backend (`backend/.env`)**:

   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   BASE_URL=http://localhost:5000
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Frontend (`frontend/.env`)**:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

### Installation & Running

From the root directory:

```bash
# Install dependencies
pnpm install

# Run development servers (Frontend + Backend)
pnpm dev

# Build the entire project
pnpm build

# Start production build
pnpm start
```

---

## 🔒 Security & Performance

- **Dynamic Limits**: Upload limits are 10MB for guests and 50MB for authenticated users.
- **JWT Auth**: Secure user accounts for tracking tool usage.
- **Fast Pathing**: Single-file operations avoid archive overhead for instant results.
- **Worker-Safe**: Heavy image processing handled via Sharp for high performance.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

**Developed with ❤️ by [gaureshpai](https://github.com/gaureshpai)**
