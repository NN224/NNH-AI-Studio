'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export function MediaUploader({ onUploadComplete }: { onUploadComplete: (media: any[]) => void }) {
  const t = useTranslations('Media.uploader');
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const formData = new FormData();

    acceptedFiles.forEach((file: File) => {
      formData.append('files', file);
    });
    
    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      toast.success(t('uploadSuccess', { count: data.uploaded.length }));
      onUploadComplete(data.uploaded);
    } catch (error) {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, t]);
  
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
            {isDragActive ? t('dropMessage') : t('dragMessage')}
          </p>
        </>
      )}
    </div>
  );
}
