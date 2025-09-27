/**
 * Material Types
 */

export interface Material {
  _id: string;
  title: string;
  description?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  link?: string;
  subject: {
    _id: string;
    name: string;
    code: string;
  };
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaterialRequest {
  title: string;
  description?: string;
  subject: string;
  link?: string;
  file?: File;
}

export interface MaterialFilters {
  subject?: string;
  uploadedBy?: string;
  search?: string;
}
