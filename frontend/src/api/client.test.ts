import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiError } from './client';

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('ApiError class', () => {
    it('should create an ApiError with correct properties', () => {
      const error = new ApiError(400, 'Bad Request', 'VALIDATION_ERROR', {
        field: 'email',
      });

      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('api function', () => {
    it('should make a successful GET request and return parsed JSON', async () => {
      const mockData = { id: 1, name: 'Test' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await api<typeof mockData>('/api/test');

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should include Authorization header if JWT token exists in localStorage', async () => {
      const token = 'test-jwt-token';
      localStorage.setItem('mvp-crm-token', token);

      const mockData = { id: 1 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await api<typeof mockData>('/api/protected');

      expect(fetchMock).toHaveBeenCalledWith('/api/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.removeItem('mvp-crm-token');
    });

    it('should make a POST request with body data', async () => {
      const mockData = { id: 1, name: 'Created' };
      const payload = { name: 'Test' };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockData,
      });

      const result = await api<typeof mockData>('/api/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    });

    it('should throw ApiError on 4xx response', async () => {
      const errorResponse = {
        code: 'INVALID_EMAIL',
        message: 'Email is invalid',
        details: { field: 'email' },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      try {
        await api('/api/test');
        expect.fail('Expected ApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.code).toBe('INVALID_EMAIL');
          expect(error.message).toBe('Email is invalid');
          expect(error.details).toEqual({ field: 'email' });
        }
      }
    });

    it('should throw ApiError on 5xx response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal Server Error',
        }),
      });

      await expect(api('/api/test')).rejects.toThrow(ApiError);
    });

    it('should dispatch auth:unauthorized before throwing on 401', async () => {
      const onUnauthorized = vi.fn();
      window.addEventListener('auth:unauthorized', onUnauthorized);
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        }),
      });

      await expect(api('/auth/me')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
      });

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    });

    it('should omit Authorization header when auth is false', async () => {
      localStorage.setItem('mvp-crm-token', 'test-jwt-token');
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

      await api('/auth/login', { auth: false });

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should throw ApiError with default message on network error', async () => {
      const networkError = new Error('Network failed');
      fetchMock.mockRejectedValueOnce(networkError);

      await expect(api('/api/test')).rejects.toThrow(ApiError);
    });

    it('should merge custom headers with defaults', async () => {
      const mockData = { id: 1 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await api('/api/test', {
        headers: { 'X-Custom': 'value' },
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        },
      });
    });
  });
});
