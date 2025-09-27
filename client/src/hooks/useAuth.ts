import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from './useApi';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api.service';
import { LoginRequest, RegisterRequest, User } from '../types/auth.types.ts'

/**
 * Hook for managing authentication operations
 */
export function useAuth() {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const authApi = useApi<User>();

  /**
   * Login user with email and password
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const response = await authApi.execute(
        () => api.post('/users/login', credentials),
        {
          onSuccess: (userData) => {
            authContext?.setUser(userData);
            navigate('/subjects');
          },
          onError: (error) => {
            console.error('Login failed:', error);
          }
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }, [authApi, authContext, navigate]);

  /**
   * Register new user
   */
  const register = useCallback(async (userData: RegisterRequest) => {
    try {
      const response = await authApi.execute(
        () => api.post('/users/register', userData),
        {
          onSuccess: (userData) => {
            authContext?.setUser(userData);
            navigate('/subjects');
          }
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }, [authApi, authContext, navigate]);

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    try {
      await authApi.execute(() => api.post('/users/logout'));
      authContext?.setUser(null);
      navigate('/login');
    } catch (error) {
      // Even if logout fails on server, clear local state
      authContext?.setUser(null);
      navigate('/login');
    }
  }, [authApi, authContext, navigate]);

  /**
   * Check current authentication status
   */
  const checkAuth = useCallback(async () => {
    try {
      return await authApi.execute(
        () => api.get('/users/profile'),
        {
          onSuccess: (userData) => {
            authContext?.setUser(userData);
          },
          onError: () => {
            authContext?.setUser(null);
          }
        }
      );
    } catch (error) {
      authContext?.setUser(null);
      throw error;
    }
  }, [authApi, authContext]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (profileData: Partial<User>) => {
    try {
      const response = await authApi.execute(
        () => api.put('/users/profile', profileData),
        {
          onSuccess: (userData) => {
            authContext?.setUser(userData);
          }
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }, [authApi, authContext]);

  return {
    // State from context and API
    user: authContext?.user || null,
    loading: authApi.loading || authContext?.loading || false,
    error: authApi.error,
    isAuthenticated: !!authContext?.user,

    // Actions
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    reset: authApi.reset
  };
}
