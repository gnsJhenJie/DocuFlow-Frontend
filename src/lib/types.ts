export interface User {
  id: string; // Assuming backend provides string IDs for users consistent with this
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export type Role = "viewer" | "editor" | "reviewer" | "admin";

export type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected";

export interface Document {
  id: string; // Assuming backend provides string IDs for documents
  title: string;
  content: string;
  image_url?: string;
  version: number;
  status: ReviewStatus;
  author_id: string; // User ID
  author_name: string;
  reviewerId?: string; // User ID - will be string in frontend state
  reviewer_name?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
}

export interface DocumentHistoryEntry {
  id: string;
  document_id: string;
  timestamp: string;
  action: string;
  actor_id: string;
  userName: string;
  details?: Record<string, any>;
}

export interface PaginatedDocumentsResponse {
  documents: Document[];
  totalPages: number;
  currentPage: number;
}

// For login response
export interface AuthResponse {
  token: string;
  user: User;
}
