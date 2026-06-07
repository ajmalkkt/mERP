/**
 * API Configuration
 * Centralizes API base URL and related configurations
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Build a full API URL from an endpoint path
 * @param endpoint - The API endpoint (e.g., '/auth/login')
 * @returns Full URL (e.g., 'http://localhost:5000/api/auth/login')
 */
export function buildApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
