/**
 * Announcement Types
 */

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  subject?: {
    _id: string;
    name: string;
    code: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  subject?: string;
}

export interface AnnouncementFilters {
  subject?: string;
  author?: string;
  search?: string;
}
