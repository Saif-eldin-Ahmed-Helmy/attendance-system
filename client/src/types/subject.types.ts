/**
 * Subject Types
 */

export interface Subject {
  _id: string;
  name: string;
  code: string;
  level: 1 | 2 | 3 | 4;
  startWeek: Date;
  doctor?: User;
  teachingAssistant?: User;
  groups: SubjectGroup[];
  sections: SubjectSection[];
  studentsCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubjectGroup {
  groupNumber: 1 | 2;
  schedule?: Schedule;
}

export interface SubjectSection {
  sectionNumber: 1 | 2 | 3 | 4;
  schedule?: Schedule;
}

export interface Schedule {
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  roomNumber?: number;
  labNumber?: number;
}

export interface SubjectFilters {
  level?: string;
  search?: string;
  doctor?: string;
  assistant?: string;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  level: 1 | 2 | 3 | 4;
  startWeek: Date;
  doctor?: string;
  teachingAssistant?: string;
}

export interface AttendanceStats {
  subject: string;
  totalRecords: number;
  statistics: {
    totalStudents: number;
    lectureAttendance: number;
    sectionAttendance: number;
    weeklyStats: Record<number, { lecture: number; section: number }>;
  };
}

// User interface for avoiding circular dependency
interface User {
  _id: string;
  name: string;
  email: string;
}
