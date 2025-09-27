import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.service';
import { ApiResponse, ApiError } from '../types/api.types';

/**
 * Custom hook for API requests with loading, error, and data state management
 * @template T - Type of the expected data
 */
export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Execute an API request
   * @param requestFn - Function that returns a Promise with the API call
   * @param options - Additional options
   */
  const execute = useCallback(async (
    requestFn: () => Promise<any>,
    options: {
      onSuccess?: (data: T) => void;
      onError?: (error: ApiError) => void;
      resetDataOnStart?: boolean;
    } = {}
  ) => {
    const { onSuccess, onError, resetDataOnStart = true } = options;

    try {
      setLoading(true);
      setError(null);

      if (resetDataOnStart) {
        setData(null);
      }

      const response = await requestFn();
      const responseData = response.data?.data || response.data;

      setData(responseData);

      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData;
    } catch (err: any) {
      const apiError: ApiError = {
        message: err.response?.data?.error?.message || err.message || 'An error occurred',
        code: err.response?.data?.error?.code || 'UNKNOWN_ERROR',
        status: err.response?.status || 500,
        timestamp: err.response?.data?.error?.timestamp || new Date().toISOString()
      };

      setError(apiError);

      if (onError) {
        onError(apiError);
      } else {
        console.error('API Error:', apiError);
      }

      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}

/**
 * Custom hook for paginated API requests
 * @template T - Type of the expected item data
 */
export function usePaginatedApi<T = any>() {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Fetch paginated data
   * @param requestFn - Function that returns a Promise with the API call
   * @param options - Additional options
   */
  const fetchPage = useCallback(async (
    requestFn: () => Promise<any>,
    options: {
      page?: number;
      append?: boolean;
      onSuccess?: (data: any) => void;
      onError?: (error: ApiError) => void;
    } = {}
  ) => {
    const { page = 1, append = false, onSuccess, onError } = options;

    try {
      setLoading(true);
      setError(null);

      const response = await requestFn();
      const { items: newItems, pagination: newPagination } = response.data.data;

      if (append && page > 1) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setPagination(newPagination);

      if (onSuccess) {
        onSuccess({ items: newItems, pagination: newPagination });
      }

      return { items: newItems, pagination: newPagination };
    } catch (err: any) {
      const apiError: ApiError = {
        message: err.response?.data?.error?.message || err.message || 'An error occurred',
        code: err.response?.data?.error?.code || 'UNKNOWN_ERROR',
        status: err.response?.status || 500,
        timestamp: err.response?.data?.error?.timestamp || new Date().toISOString()
      };

      setError(apiError);

      if (onError) {
        onError(apiError);
      }

      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load next page
   */
  const loadNext = useCallback(async (requestFn: (page: number) => Promise<any>) => {
    if (pagination.hasNext && !loading) {
      await fetchPage(
        () => requestFn(pagination.currentPage + 1),
        { page: pagination.currentPage + 1, append: true }
      );
    }
  }, [pagination.hasNext, pagination.currentPage, loading, fetchPage]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(async (requestFn: (page: number) => Promise<any>) => {
    await fetchPage(
      () => requestFn(pagination.currentPage),
      { page: pagination.currentPage }
    );
  }, [pagination.currentPage, fetchPage]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setItems([]);
    setPagination({
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      hasNext: false,
      hasPrev: false
    });
    setError(null);
    setLoading(false);
  }, []);

  return {
    items,
    pagination,
    loading,
    error,
    fetchPage,
    loadNext,
    refresh,
    reset
  };
}
