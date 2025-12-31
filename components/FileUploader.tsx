
import React, { useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface Props {
  onUpload: (file: File) => void;
  accept: string;
  label: string;
  description: string;
}

const FileUploader: React.FC<Props> = ({ onUpload, accept, label, description }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File | null) => {
    if (file) onUpload(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      className={`
        relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer
        ${isDragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'}
      `}
      onClick={() => document.getElementById(`file-input-${label}`)?.click()}
    >
      <input
        type="file"
        id={`file-input-${label}`}
        className="hidden"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
        <CloudArrowUpIcon className="w-10 h-10 text-indigo-500" />
      </div>
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-400 text-sm mt-1">{description}</p>
      <button className="mt-6 bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors">
        Choose File
      </button>
    </div>
  );
};

export default FileUploader;
