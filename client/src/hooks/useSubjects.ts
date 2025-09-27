import { useCallback } from 'react';
import { useApi, usePaginatedApi } from './useApi';
import api from '../services/api.service';
import { Subject, SubjectFilters, CreateSubjectRequest, AttendanceStats } from '../types/subject.types';

/**
 * Hook for managing subject-related API operations
 */
export function useSubjects() {
  const paginatedApi = usePaginatedApi<Subject>();
  const subjectApi = useApi<Subject>();
  const statsApi = useApi<AttendanceStats>();

  /**
   * Fetch subjects with filters and pagination
   */
  const fetchSubjects = useCallback(async (
    filters: SubjectFilters = {},
    page: number = 1,
    limit: number = 10
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    return paginatedApi.fetchPage(
      () => api.get(`/subjects/list?${params}`),
      { page }
    );
  }, [paginatedApi]);

  /**
   * Get subject by ID
   */
  const getSubject = useCallback(async (subjectId: string) => {
    return subjectApi.execute(
      () => api.get(`/subjects/${subjectId}`)
    );
  }, [subjectApi]);

  /**
   * Create new subject
   */
  const createSubject = useCallback(async (subjectData: CreateSubjectRequest) => {
    return subjectApi.execute(
      () => api.post('/subjects', subjectData)
    );
  }, [subjectApi]);

  /**
   * Update subject
   */
  const updateSubject = useCallback(async (subjectId: string, subjectData: Partial<Subject>) => {
    return subjectApi.execute(
      () => api.put(`/subjects/${subjectId}`, subjectData)
    );
  }, [subjectApi]);

  /**
   * Get subject attendance statistics
   */
  const getSubjectStats = useCallback(async (
    subjectId: string,
    filters: { week?: number; group?: number; section?: number } = {}
  ) => {
    const params = new URLSearchParams(
      Object.entries(filters).map(([key, value]) => [key, value.toString()])
    );

    return statsApi.execute(
      () => api.get(`/subjects/${subjectId}/attendance/stats?${params}`)
    );
  }, [statsApi]);

  return {
    // Data and states
    subjects: paginatedApi.items,
    pagination: paginatedApi.pagination,
    loading: paginatedApi.loading || subjectApi.loading || statsApi.loading,
    error: paginatedApi.error || subjectApi.error || statsApi.error,
    subject: subjectApi.data,
    stats: statsApi.data,

    // Actions
    fetchSubjects,
    getSubject,
    createSubject,
    updateSubject,
    getSubjectStats,
    loadMore: paginatedApi.loadNext,
    refresh: paginatedApi.refresh,
    reset: () => {
      paginatedApi.reset();
      subjectApi.reset();
      statsApi.reset();
    }
  };
}
