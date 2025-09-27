/**
 * Student Types
 */

export interface Student {
  _id: string;
  id: string; // Student ID number
  name: string;
  level: 1 | 2 | 3 | 4;
  subjects: string[]; // Subject names for display
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentSubject {
  subject: string | Subject;
  group?: 1 | 2;
  section?: 1 | 2 | 3 | 4;
}

export interface StudentFilters {
  level?: string;
  search?: string;
}

export interface CreateStudentRequest {
  name: string;
  id: string;
  level: 1 | 2 | 3 | 4;
}

export interface StudentAttendance {
  _id: string;
  student: string;
  subject: Subject;
  week: number;
  group?: number;
  section?: number;
  lectureAttendanceTime?: Date;
  sectionAttendanceTime?: Date;
}

export interface StudentUploadRequest {
  subject: string;
  group?: number;
  section?: number;
}

// Import Subject type to avoid circular dependency issues
interface Subject {
  _id: string;
  name: string;
  code: string;
}
