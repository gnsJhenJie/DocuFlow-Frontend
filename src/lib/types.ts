
export interface User {
  id: string; // Assuming backend provides string IDs for users consistent with this
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export type Role = 'viewer' | 'editor' | 'reviewer' | 'admin';

export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface Document {
  id: string; // Assuming backend provides string IDs for documents
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string; // User ID
  authorName: string;
  reviewerId?: string; // User ID - will be string in frontend state
  reviewerName?: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  version: number;
}

export interface DocumentHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
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
