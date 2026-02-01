![Utility Hub Logo](frontend/public/logo.png)

# Utility Hub

This is a web-based utility platform that provides users with multiple everyday tools in one place. It is built using the MERN stack (MongoDB, Express.js, React.js, Node.js) with TailwindCSS for styling.

## Environment Variables

This application uses environment variables for configuration. You need to create `.env` files in both the `backend` and `frontend` directories.

### Backend (`backend/.env`)

Create a file named `.env` in the `backend` directory with the following content:

```
PORT=YOUR_BACKEND_PORT
MONGO_URI=mongodb://localhost:27017/utilityhub
JWT_SECRET=your_jwt_secret_key
BASE_URL=http://localhost:5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

- `PORT`: The port the backend server will run on.
- `MONGO_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A secret key for JWT authentication.
- `BASE_URL`: The base URL of your backend server (e.g., `http://localhost:5000` for local development).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase credentials.

### Frontend (`frontend/.env`)

Create a file named `.env` in the `frontend` directory with the following content:

```
VITE_API_BASE_URL=http://localhost:5000
```

- `VITE_API_BASE_URL`: The base URL of your backend API. This should match the `BASE_URL` in your backend's `.env` file.

### Login-Based File Limits

- File upload limits are dynamically adjusted based on user authentication status: 10MB for unauthenticated users and 50MB for authenticated users, providing enhanced flexibility for larger file processing.

### Image Tools

1.  **Image Format Converter**: Convert images between various formats (JPG, PNG, WebP, TIFF, AVIF).
2.  **Image Compressor**: Reduce the file size of your images while maintaining quality.
3.  **Image Resizer**: Change the dimensions (width and height) of your images.
4.  **PNG to JPG Converter**: Quickly convert PNG images to JPG format.
5.  **Image Cropper**: Crop images to a specific area or aspect ratio.
6.  **Image Grayscaler**: Convert your colored images to grayscale.
7.  **Image Flipper**: Flip images horizontally or vertically.
8.  **Image to Base64 Converter**: Convert images into Base64 strings for embedding or transfer.
9.  **Image to PDF Converter**: Combine multiple images into a single PDF document.

### PDF Tools

1.  **PDF Merger**: Combine multiple PDF documents into one single PDF file.
2.  **PDF Splitter**: Split a PDF document into multiple smaller PDF files by pages or ranges.
3.  **PDF Compressor**: Reduce the file size of your PDF documents.
4.  **PDF to Word Converter**: Convert PDF into word format.
5.  **PDF to Excel Converter**: Convert PDF into Excel spreadsheets format.
6.  **Text to PDF Generator**: Convert plain text content into a PDF document.
7.  **PDF to Text Converter**: Extract all text content from PDF documents.
8.  **PDF Rotator**: Rotate pages within a PDF document by 90, 180, or 270 degrees.
9.  **PDF Page Deleter**: Delete specific pages from a PDF document.

### Text Tools

1.  **Text Case Converter**: Convert text to various case formats (e.g., UPPERCASE, lowercase, Title Case).
2.  **Text Difference Checker**: Compare two texts and highlight the differences between them.
3.  **Base64 Text Converter**: Encode or decode text to/from Base64 format.
4.  **HTML to Markdown Converter**: Convert HTML content to Markdown format.
5.  **Markdown to HTML Converter**: Convert Markdown content to HTML format.
6.  **JSON Formatter/Validator**: Format and validate JSON data for readability and correctness.
7.  **Hash Generator**: Generate various cryptographic hashes (e.g., MD5, SHA1, SHA256) from text.
8.  **Password Generator**: Generate strong, random, and customizable passwords.
9.  **CSV to JSON Converter**: Convert CSV (Comma Separated Values) data to JSON (JavaScript Object Notation) format.

### Web Tools

1.  **Link Shortener**: Shorten long URLs for easier sharing and tracking.
2.  **QR Code Generator**: Create QR codes from text or URLs.
3.  **QR Code Scanner**: Scan QR codes from uploaded images to extract data.
4.  **Website Screenshot Generator**: Capture a full-page screenshot of any website.
5.  **Favicon Extractor**: Extract favicons (website icons) from any website URL.
6.  **URL Redirect Checker**: Trace and analyze URL redirect chains.
7.  **Robots.txt / Sitemap.xml Viewer**: View and validate `robots.txt` and `sitemap.xml` files for SEO analysis.
8.  **JSON <-> XML Converter**: Convert between JSON and XML data formats, essential for web service integration and API data transformation.
9.  **Password Strength Checker**: Analyze the strength of your password and provide feedback for improvement.

### General/Core Functionalities

1.  **User Authentication**: Secure user registration and login system using JWT (JSON Web Tokens).

## Authentication:

This application includes JWT-based authentication. Some premium/bulk features are protected and require a user to be logged in. You can register and log in using the provided forms.

## How to Run the Application:

**1. Start the Application (Frontend & Backend):**
Navigate to the root directory of the project in your terminal:

```bash
npm install
npm start
```

This will install all root dependencies (including `concurrently`) and then start both the backend and frontend servers. The backend server will run on the port specified in your `backend/.env` file (default: 5000) and the frontend application will open in your browser, usually at `http://localhost:3000`.

**Alternatively, start servers individually:**

**1. Start the Backend Server:**
Navigate to the `backend` directory in your terminal:

```bash
cd backend
```

Install dependencies (if you haven't already):

```bash
npm install
```

Start the server:

```bash
npm start
```

The backend server will run on the port specified in your `backend/.env` file (default: 5000).

**2. Start the Frontend Development Server:**
Open a new terminal window and navigate to the `frontend` directory:

```bash
cd frontend
```

Install dependencies (if you haven't already):

```bash
npm install
```

Start the development server:

```bash
npm start
```

The frontend application will open in your browser, usually at `http://localhost:3000`.

**4. MongoDB:**
Ensure you have a MongoDB instance running. The application is configured to connect to `mongodb://localhost:27017/utilityhub`. If your MongoDB is running on a different port or location, update the `MONGO_URI` in `backend/.env` accordingly.
