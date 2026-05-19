/**
 * Shared TypeScript types for frontend
 * These types should match the backend API contracts
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'salesperson';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lead types
export interface Lead {
  id: string;
  title: string;
  email: string;
  phone?: string;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Analytics types
export interface LeadMetrics {
  person: string;
  count: number;
}

export interface StageMetrics {
  stage: string;
  count: number;
}
