/**
 * Announcement and Material Types
 */

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: User;
  subject?: Subject;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  _id: string;
  title: string;
  description?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  subject: Subject;
  uploadedBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Camera {
  _id: string;
  cameraId: string;
  location: string;
  isActive: boolean;
  subjectId?: string;
  groupNumber?: number;
  sectionNumber?: number;
}

/**
 * Form Types
 */
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender?: 'male' | 'female' | 'not_specified';
  dateOfBirth?: string;
}

export interface SubjectFormData {
  name: string;
  code: string;
  level: 1 | 2 | 3 | 4;
  startWeek: string;
}

export interface StudentFormData {
  name: string;
  id: string;
  level: 1 | 2 | 3 | 4;
}

/**
 * WebSocket Message Types
 */
export interface WebSocketMessage {
  type: 'connection' | 'attendance_notification' | 'system_notification' | 'error' | 'ping' | 'pong';
  message?: string;
  data?: any;
  timestamp: string;
  clientId?: string;
}

export interface AttendanceNotification {
  student: {
    id: string;
    name: string;
  };
  subject: {
    name: string;
    code: string;
  };
  sessionType: 'lecture' | 'section';
  timestamp: Date;
  week: number;
}
