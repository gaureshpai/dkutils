
import { useState, useContext, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext.jsx';

const ImageCompressor = () => {
  const { state: { isAuthenticated } } = useContext(AuthContext);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [quality, setQuality] = useState(80);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [convertedZipFile, setConvertedZipFile] = useState(null);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/avif'];
    const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    const validFiles = [];
    let hasInvalidFile = false;

    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only images (JPEG, PNG, GIF, WebP, TIFF, AVIF) are allowed.`);
        hasInvalidFile = true;
        return;
      }
      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`);
        hasInvalidFile = true;
        return;
      }
      validFiles.push(file);
    });

    setSelectedFiles(validFiles);
    if (hasInvalidFile) {
      e.target.value = '';
    }
  };

  const onQualityChange = (e) => {
    setQuality(e.target.value);
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error('Please select at least one image file.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append('images', file);
    }
    formData.append('quality', quality);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/convert/compress-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setConvertedZipFile(res.data);
      toast.success('Images compressed successfully! Starting download...');
      handleDownload(res.data.path, res.data.originalname);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || 'Error compressing images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Image Compressor</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-black" htmlFor="multiple_files">Upload multiple image files</label>
          <input ref={fileInputRef} accept="image/*" className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" id="multiple_files" type="file" multiple onChange={onFileChange} />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-black" htmlFor="quality">Quality (1-100%)</label>
          <input type="number" id="quality" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="80" value={quality} onChange={onQualityChange} />
        </div>
        <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" disabled={loading}>{loading ? 'Compressing...' : 'Compress Images'}</button>
      </form>
    </div>
  );
};

export default ImageCompressor;