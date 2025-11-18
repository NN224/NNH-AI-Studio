'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function MediaUploader({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  
  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    const formData = new FormData();
    
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      toast.success(`Successfully uploaded ${data.uploaded.length} image(s)`);
      onUploadComplete(data.uploaded);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });
  
  return (
    <div {...getRootProps()} className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500 transition">
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="w-12 h-12 mx-auto animate-spin" />
      ) : (
        <>
          <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
          <p className="text-zinc-500">
            {isDragActive ? 'Drop the images here' : 'Drag and drop some files here, or click to select files'}
          </p>
        </>
      )}
    </div>
  );
}
