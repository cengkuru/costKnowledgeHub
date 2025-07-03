import { Injectable, inject } from '@angular/core';
import { 
  Storage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  UploadTask,
  UploadTaskSnapshot,
  getMetadata,
  updateMetadata
} from '@angular/fire/storage';
import { Observable } from 'rxjs';

export interface UploadProgress {
  progress: number;
  snapshot: UploadTaskSnapshot;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl?: string;
  storagePath: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage = inject(Storage);
  
  /**
   * Upload a file to Firebase Storage
   * @param file File to upload
   * @param path Storage path (e.g., 'resources/documents/2024/')
   * @param metadata Optional metadata
   * @returns Observable of upload progress
   */
  uploadFile(
    file: File, 
    path: string, 
    metadata?: { [key: string]: string }
  ): Observable<UploadProgress> {
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const fullPath = `${path}/${fileName}`;
    
    // Create storage reference
    const storageRef = ref(this.storage, fullPath);
    
    // Set metadata
    const uploadMetadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    };
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file, uploadMetadata);
    
    // Return observable for progress tracking
    return new Observable<UploadProgress>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({ progress, snapshot });
        },
        (error) => {
          console.error('Upload error:', error);
          observer.error(error);
        },
        async () => {
          observer.complete();
        }
      );
    });
  }
  
  /**
   * Upload file and get download URL
   * @param file File to upload
   * @param path Storage path
   * @param metadata Optional metadata
   * @returns Promise with file metadata including download URL
   */
  async uploadFileWithUrl(
    file: File,
    path: string,
    metadata?: { [key: string]: string }
  ): Promise<FileMetadata> {
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const fullPath = `${path}/${fileName}`;
    
    const storageRef = ref(this.storage, fullPath);
    
    const uploadMetadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    };
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file, uploadMetadata);
    
    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      downloadUrl,
      storagePath: fullPath,
      uploadedAt: new Date(),
      uploadedBy: metadata?.uploadedBy
    };
  }
  
  /**
   * Delete a file from storage
   * @param path Full storage path to the file
   */
  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(this.storage, path);
    await deleteObject(storageRef);
  }
  
  /**
   * Get file metadata
   * @param path Full storage path to the file
   */
  async getFileMetadata(path: string): Promise<any> {
    const storageRef = ref(this.storage, path);
    const metadata = await getMetadata(storageRef);
    const downloadUrl = await getDownloadURL(storageRef);
    
    return {
      ...metadata,
      downloadUrl
    };
  }
  
  /**
   * Update file metadata
   * @param path Full storage path to the file
   * @param metadata Metadata to update
   */
  async updateFileMetadata(path: string, metadata: { [key: string]: string }): Promise<void> {
    const storageRef = ref(this.storage, path);
    await updateMetadata(storageRef, {
      customMetadata: metadata
    });
  }
  
  /**
   * Get download URL for a file
   * @param path Full storage path to the file
   */
  async getDownloadUrl(path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    return getDownloadURL(storageRef);
  }
  
  /**
   * Sanitize filename for storage
   * @param fileName Original filename
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  /**
   * Format file size for display
   * @param bytes File size in bytes
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Get file extension from filename
   * @param fileName File name
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }
  
  /**
   * Check if file type is allowed
   * @param fileType MIME type
   */
  isAllowedFileType(fileType: string): boolean {
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Spreadsheets
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      // Presentations
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    return allowedTypes.includes(fileType);
  }
  
  /**
   * Get appropriate storage path based on resource type
   * @param resourceType Type of resource
   * @param year Year for organization
   */
  getStoragePath(resourceType: string, year?: number): string {
    const currentYear = year || new Date().getFullYear();
    const typeMap: { [key: string]: string } = {
      'guide': 'guides',
      'case-study': 'case-studies',
      'report': 'reports',
      'dataset': 'datasets',
      'tool': 'tools',
      'policy': 'policy-briefs',
      'template': 'templates',
      'infographic': 'infographics',
      'other': 'other'
    };
    
    const folder = typeMap[resourceType] || 'other';
    return `resources/${folder}/${currentYear}`;
  }
}