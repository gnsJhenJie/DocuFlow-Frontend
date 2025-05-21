
// src/lib/apiClient.ts
import type { AuthResponse, PaginatedDocumentsResponse, Document, User, DocumentHistoryEntry } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface RequestOptions extends RequestInit {
  needsAuth?: boolean;
  isFormData?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { needsAuth = true, isFormData = false, ...fetchOptions } = options;
  const headers: HeadersInit = isFormData ? {} : { 'Content-Type': 'application/json' };

  if (needsAuth) {
    const token = localStorage.getItem('docuflow_jwt_token');
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    } else {
      // Handle cases where token is required but not found, e.g. redirect to login
      // For now, just log it. In a real app, this might trigger a redirect.
      console.warn(`Auth token not found for ${endpoint}`);
    }
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Not a JSON response
        errorData = { detail: response.statusText || 'An unknown error occurred' };
      }
      console.error('API Error:', endpoint, response.status, errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        // No content to parse
        return undefined as T;
    }
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}

export const apiClient = {
  // Auth
  register: (data: any) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data), needsAuth: false }),
  login: (data: any) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data), needsAuth: false }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<User>('/auth/me'),
  getGoogleAuthUrl: () => request<{ url: string }>('/auth/google/url', { needsAuth: false }),
  exchangeGoogleCode: (code: string) => request<AuthResponse>('/auth/google/callback', { method: 'POST', body: JSON.stringify({ code }), needsAuth: false }),


  // Users
  getUsers: (params?: URLSearchParams) => request<User[]>(`/users${params ? `?${params.toString()}`: ''}`),
  getReviewers: () => request<User[]>(`/users/reviewers`),
  updateUserRole: (userId: string, role: string) => request<User>(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // Documents
  createDocument: (data: any) => request<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  getDocuments: (params: URLSearchParams) => request<PaginatedDocumentsResponse>(`/documents?${params.toString()}`),
  getDocumentById: (id: string) => request<Document>(`/documents/${id}`),
  updateDocument: (id: string, data: any) => request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
  approveDocument: (id: string) => request<Document>(`/documents/${id}/approve`, { method: 'POST' }),
  rejectDocument: (id: string, reason: string) => request<Document>(`/documents/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reassignReviewer: (id: string, newReviewerId: number) => request<Document>(`/documents/${id}/reassign`, { method: 'POST', body: JSON.stringify({ newReviewerId }) }), // API expects number
  getDocumentHistory: (id: string) => request<DocumentHistoryEntry[]>(`/documents/${id}/history`),

  // Upload
  uploadImage: (formData: FormData) => request<{ imageUrl: string }>('/upload', { method: 'POST', body: formData, isFormData: true }),
};
