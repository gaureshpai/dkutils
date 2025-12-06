
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const TextToPdfGenerator = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setText(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/convert/text-to-pdf`, { text }, {
        responseType: 'blob'
      });


      const zipBlob = new Blob([res.data], { type: 'application/zip' });


      const url = window.URL.createObjectURL(zipBlob);


      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-text-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);


      toast.success('PDF generated successfully!');
      setText('');

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || 'Error generating PDF from text. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Text to PDF Generator</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <textarea
            className="w-full px-3 py-2 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            rows="10"
            placeholder="Enter text here..."
            value={text}
            onChange={onChange}
          ></textarea>
        </div>
        <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" disabled={loading}>
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
      </form>
    </div>
  );
};

export default TextToPdfGenerator;
