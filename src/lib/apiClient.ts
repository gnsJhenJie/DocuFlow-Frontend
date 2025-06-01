
// src/lib/apiClient.ts
import type { AuthResponse, PaginatedDocumentsResponse, Document, User, DocumentHistoryEntry } from './types';

let determinedApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!determinedApiBaseUrl || determinedApiBaseUrl.trim() === '') {
  console.warn(
    '[ApiClient] NEXT_PUBLIC_API_BASE_URL is not set, empty, or whitespace. Falling back to "/api". ' +
    'Ensure .env.local is in the project root, correctly configured (e.g., NEXT_PUBLIC_API_BASE_URL="http://localhost:8080/api"), ' +
    'and that you have RESTARTED your Next.js development server after changes to .env.local.'
  );
  determinedApiBaseUrl = '/api';
}
const API_BASE_URL = determinedApiBaseUrl;
console.log('[ApiClient] Effective API_BASE_URL being used:', API_BASE_URL);


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
    const token = typeof window !== 'undefined' ? localStorage.getItem('docuflow_jwt_token') : null;
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
  };

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`[ApiClient] Attempting to fetch: ${fullUrl}`, options.method || 'GET'); // Log the full URL and method

  try {
    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON (e.g., HTML error page from a misconfigured server or proxy)
        const textError = await response.text();
        errorData = { detail: response.statusText || 'An unknown error occurred', responseBody: textError.substring(0, 500) };
      }
      console.error('API Error:', endpoint, response.status, errorData);
      return errorData as T; // Return error data instead of throwing
      // throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
    }
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint} to ${fullUrl}:`, error);
    throw error; // Re-throw to be caught by calling function
    // return (error as any) as T; // Return error as T to avoid breaking the flow
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
  createDocument: (data: any) => {
    // Ensure reviewerId is number if present
    const payload = { ...data };
    if (payload.reviewerId && typeof payload.reviewerId === 'string') {
      payload.reviewerId = parseInt(payload.reviewerId, 10);
    }
    return request<Document>('/documents', { method: 'POST', body: JSON.stringify(payload) });
  },
  getDocuments: (params: URLSearchParams) => request<PaginatedDocumentsResponse>(`/documents?${params.toString()}`),
  getDocumentById: (id: string) => request<Document>(`/documents/${id}`),
  updateDocument: (id: string, data: any) => {
     // Ensure reviewerId is number if present
    const payload = { ...data };
    if (payload.reviewerId && typeof payload.reviewerId === 'string') {
      payload.reviewerId = parseInt(payload.reviewerId, 10);
    }
    if (payload.authorId && typeof payload.authorId === 'string') {
      payload.authorId = parseInt(payload.authorId, 10);
    }
    return request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteDocument: (id: string) => request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
  approveDocument: (id: string) => request<Document>(`/documents/${id}/approve`, { method: 'POST' }),
  rejectDocument: (id: string, reason: string) => request<Document>(`/documents/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reassignReviewer: (documentId: string, newReviewerId: number) => // API spec says number
    request<Document>(`/documents/${documentId}/reassign`, { method: 'POST', body: JSON.stringify({ newReviewerId }) }),
  getDocumentHistory: (id: string) => request<DocumentHistoryEntry[]>(`/documents/${id}/history`),

  // Upload
  uploadImage: (formData: FormData) => request<{ imageUrl: string }>('/upload', { method: 'POST', body: formData, isFormData: true }),
};
