import { useCallback } from 'react';
import { useApi, usePaginatedApi } from './useApi';
import api from '../services/api.service';
import { Student, StudentFilters, CreateStudentRequest, StudentAttendance } from '../types/student.types';

/**
 * Hook for managing student-related API operations
 */
export function useStudents() {
  const paginatedApi = usePaginatedApi<Student>();
  const studentApi = useApi<Student>();
  const attendanceApi = useApi<StudentAttendance[]>();

  /**
   * Fetch students with filters and pagination
   */
  const fetchStudents = useCallback(async (
    filters: StudentFilters = {},
    page: number = 1,
    limit: number = 10
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    return paginatedApi.fetchPage(
      () => api.get(`/students/list?${params}`),
      { page }
    );
  }, [paginatedApi]);

  /**
   * Get student by ID
   */
  const getStudent = useCallback(async (studentId: string) => {
    return studentApi.execute(
      () => api.get(`/students/view/${studentId}`)
    );
  }, [studentApi]);

  /**
   * Create new student
   */
  const createStudent = useCallback(async (studentData: CreateStudentRequest) => {
    return studentApi.execute(
      () => api.post('/students', studentData)
    );
  }, [studentApi]);

  /**
   * Update student
   */
  const updateStudent = useCallback(async (studentId: string, studentData: Partial<Student>) => {
    return studentApi.execute(
      () => api.put(`/students/${studentId}`, studentData)
    );
  }, [studentApi]);

  /**
   * Upload students from file
   */
  const uploadStudents = useCallback(async (
    file: File,
    subject: string,
    group?: number,
    section?: number
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    if (group) formData.append('group', group.toString());
    if (section) formData.append('section', section.toString());

    return studentApi.execute(
      () => api.post('/students/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  }, [studentApi]);

  /**
   * Get student attendance
   */
  const getStudentAttendance = useCallback(async (
    studentId: string,
    subjectId?: string
  ) => {
    const params = subjectId ? `?subject=${subjectId}` : '';
    return attendanceApi.execute(
      () => api.get(`/students/${studentId}/attendance${params}`)
    );
  }, [attendanceApi]);

  /**
   * Search students by name or ID
   */
  const searchStudents = useCallback(async (query: string) => {
    return paginatedApi.fetchPage(
      () => api.get(`/students/list?search=${encodeURIComponent(query)}`)
    );
  }, [paginatedApi]);

  return {
    // Data and states
    students: paginatedApi.items,
    pagination: paginatedApi.pagination,
    loading: paginatedApi.loading || studentApi.loading || attendanceApi.loading,
    error: paginatedApi.error || studentApi.error || attendanceApi.error,
    student: studentApi.data,
    attendance: attendanceApi.data,

    // Actions
    fetchStudents,
    getStudent,
    createStudent,
    updateStudent,
    uploadStudents,
    getStudentAttendance,
    searchStudents,
    loadMore: paginatedApi.loadNext,
    refresh: paginatedApi.refresh,
    reset: () => {
      paginatedApi.reset();
      studentApi.reset();
      attendanceApi.reset();
    }
  };
}
