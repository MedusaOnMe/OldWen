import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface ImageUploadResult {
  url: string;
  path: string;
}

export class ImageUploadService {
  /**
   * Upload an image file to Firebase Storage
   */
  async uploadImage(file: File, folder: string, campaignId?: string): Promise<ImageUploadResult> {
    try {
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // TEMPORARY: Use base64 data URLs as fallback for CORS issues
      // In production, configure Firebase Storage CORS rules
      const url = await this.convertToBase64(file);
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const path = campaignId 
        ? `campaigns/${campaignId}/${folder}/${timestamp}_${randomId}`
        : `${folder}/${timestamp}_${randomId}`;

      return {
        url,
        path
      };

      /* TODO: Enable when Firebase Storage CORS is properly configured
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}_${randomId}.${extension}`;

      // Create storage path
      const path = campaignId 
        ? `campaigns/${campaignId}/${folder}/${filename}`
        : `${folder}/${filename}`;

      // Create reference and upload
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);

      // Get download URL
      const url = await getDownloadURL(snapshot.ref);

      return {
        url,
        path
      };
      */
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Convert file to base64 data URL with compression (temporary fallback)
   */
  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate compressed dimensions (max 800px width)
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 with compression (0.7 quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload logo image with validation
   */
  async uploadLogo(file: File, campaignId?: string): Promise<ImageUploadResult> {
    // Validate aspect ratio for logo (should be square)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const aspectRatio = img.width / img.height;
        
        // Allow some tolerance for square aspect ratio
        if (aspectRatio < 0.8 || aspectRatio > 1.2) {
          reject(new Error('Logo image should have a square aspect ratio (1:1)'));
          return;
        }

        try {
          const result = await this.uploadImage(file, 'logos', campaignId);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for validation'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload banner image with validation
   */
  async uploadBanner(file: File, campaignId?: string): Promise<ImageUploadResult> {
    // Validate aspect ratio for banner (should be 3:1)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const aspectRatio = img.width / img.height;
        
        // Allow some tolerance for 3:1 aspect ratio
        if (aspectRatio < 2.8 || aspectRatio > 3.2) {
          reject(new Error('Banner image should have a 3:1 aspect ratio'));
          return;
        }

        try {
          const result = await this.uploadImage(file, 'banners', campaignId);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for validation'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}

// Export singleton instance
export const imageUploadService = new ImageUploadService();