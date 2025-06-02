import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface ImageUploadProps {
  label: string;
  aspectRatio: '1:1' | '3:1';
  maxSize: number; // in bytes
  onImageSelect: (file: File | null) => void;
  onImageUrl?: (url: string | null) => void;
  required?: boolean;
  className?: string;
  accept?: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
  size?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  aspectRatio,
  maxSize,
  onImageSelect,
  onImageUrl,
  required = false,
  className = '',
  accept = 'image/*'
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getExpectedRatio = useCallback(() => {
    switch (aspectRatio) {
      case '1:1': return 1;
      case '3:1': return 3;
      default: return 1;
    }
  }, [aspectRatio]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const validateImage = useCallback(async (file: File): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      // File type validation
      if (!file.type.startsWith('image/')) {
        resolve({ isValid: false, error: 'Please select a valid image file' });
        return;
      }

      // Size validation
      if (file.size > maxSize) {
        resolve({
          isValid: false,
          error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
        });
        return;
      }

      // Aspect ratio validation
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const { naturalWidth: width, naturalHeight: height } = img;
        const actualRatio = width / height;
        const expectedRatio = getExpectedRatio();
        const tolerance = 0.05; // 5% tolerance

        URL.revokeObjectURL(objectUrl);

        if (Math.abs(actualRatio - expectedRatio) > expectedRatio * tolerance) {
          resolve({
            isValid: false,
            error: `Image aspect ratio (${Math.round(actualRatio * 100) / 100}:1) doesn't match required ${aspectRatio} ratio`,
            width,
            height,
            size: file.size
          });
        } else {
          resolve({
            isValid: true,
            width,
            height,
            size: file.size
          });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ isValid: false, error: 'Invalid image file format' });
      };

      img.src = objectUrl;
    });
  }, [aspectRatio, maxSize, formatFileSize, getExpectedRatio]);

  const processFile = useCallback(async (file: File) => {
    setIsValidating(true);
    setError(null);
    setUploadProgress(0);

    try {
      const validation = await validateImage(file);

      if (!validation.isValid) {
        setError(validation.error || 'Image validation failed');
        setPreview(null);
        onImageSelect(null);
        if (onImageUrl) onImageUrl(null);
        return;
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onImageSelect(file);

      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 50);

      // If URL callback provided, you could upload to storage here
      if (onImageUrl) {
        // This would be replaced with actual storage upload
        setTimeout(() => {
          onImageUrl(objectUrl);
          clearInterval(progressInterval);
          setUploadProgress(100);
        }, 500);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during image processing');
      setPreview(null);
      onImageSelect(null);
      if (onImageUrl) onImageUrl(null);
    } finally {
      setIsValidating(false);
    }
  }, [validateImage, onImageSelect, onImageUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, [processFile]);

  const removeImage = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setError(null);
    setUploadProgress(0);
    onImageSelect(null);
    if (onImageUrl) onImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [preview, onImageSelect, onImageUrl]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-white text-lg font-semibold">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      <div
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer
          ${dragActive 
            ? 'border-purple-400 bg-purple-500/10 scale-105' 
            : 'border-white/30 hover:border-white/50'
          }
          ${preview ? 'bg-white/5' : 'hover:bg-white/5'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!preview ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          required={required}
        />

        {preview ? (
          <div className="space-y-4">
            <div className="relative group">
              <img
                src={preview}
                alt="Preview"
                className={`
                  mx-auto rounded-lg shadow-2xl max-h-48 w-auto
                  ${aspectRatio === '1:1' ? 'aspect-square object-cover' : 'aspect-[3/1] object-cover'}
                `}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  className="bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>

            {uploadProgress < 100 && (
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {uploadProgress === 100 && (
              <div className="flex items-center justify-center text-green-400">
                <Check className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Image ready</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center">
              {isValidating ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70" />
              ) : (
                <ImageIcon className="h-8 w-8 text-white/70" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-white font-medium">
                {dragActive ? 'Drop image here' : 'Choose image or drag & drop'}
              </p>
              <p className="text-gray-300 text-sm">
                Required: {aspectRatio} aspect ratio • Max {formatFileSize(maxSize)}
              </p>
              <p className="text-gray-400 text-xs">
                Supports: JPG, PNG, GIF, WebP
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={openFileDialog}
            >
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>
        )}

        {isValidating && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <div className="bg-white/10 rounded-lg p-4 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
              <span className="text-white font-medium">Validating image...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImageUpload;