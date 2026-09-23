import type { Dispatch, SetStateAction } from 'react';

export interface User {
  _id?: string;
  email: string;
  name: string;
  role: 'management' | 'doctor' | 'teaching assistant' | 'unverified';
  preferredLanguage?: 'en' | 'ar';
  subjects?: { _id: string; name: string; code?: string }[];
  profilePicture?: string;
}

export interface LoginRequest { email: string; password: string }
export interface RegisterRequest extends LoginRequest {
  name: string;
  gender?: 'male' | 'female' | 'not_specified';
  dateOfBirth?: string;
}
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: Dispatch<SetStateAction<User | null>>;
  isAuthenticated: boolean;
}
