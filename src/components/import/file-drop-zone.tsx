'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { FileUp, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
}

export function FileDropZone({
  onFileSelect,
  accept = { 'application/pdf': ['.pdf'] },
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  selectedFile,
  onClear,
}: FileDropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.message.includes('size')) {
          setError('File is too large. Maximum size is 10MB.');
        } else {
          setError('Please upload a PDF file.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled,
    multiple: false,
  });

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-10 w-10 text-primary" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          {onClear && (
            <Button variant="ghost" size="icon" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive && 'border-primary bg-primary/5',
        !isDragActive && 'border-muted-foreground/25 hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        error && 'border-red-500'
      )}
    >
      <input {...getInputProps()} />
      <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      {isDragActive ? (
        <p className="text-primary font-medium">Drop your bank statement here...</p>
      ) : (
        <>
          <p className="font-medium mb-1">Drag and drop your bank statement</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-2">PDF files only, max 10MB</p>
        </>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
