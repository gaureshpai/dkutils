import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';

const PdfToTextConverter = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file && file.type === 'application/pdf') {
      if (file.size > maxFileSize) {
        toast.error(`File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`);
        setSelectedFile(null);
        e.target.value = null;
      } else {
        setSelectedFile(file);
        setExtractedText('');
      }
    } else {
      setSelectedFile(null);
      setExtractedText('');
      toast.error('Please select a PDF file.');
      e.target.value = '';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a PDF file first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/convert/pdf-to-text`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const extractedTextContent = res.data;
      setExtractedText(extractedTextContent);
      toast.success('Text extracted successfully! Starting download...');
      handleDownload(extractedTextContent, `extracted-text-${Date.now()}.txt`);
      setSelectedFile(null);
      setExtractedText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || 'Error extracting text from PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (content, fileName) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Download started!');
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">PDF to Text Converter</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-900" htmlFor="pdf_file">Upload PDF</label>
          <input ref={fileInputRef} className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" id="pdf_file" type="file" onChange={onFileChange} accept=".pdf" />
        </div>
        <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" disabled={loading}>{loading ? 'Extracting...' : 'Extract Text'}</button>
      </form>
    </div>
  );
};

export default PdfToTextConverter;