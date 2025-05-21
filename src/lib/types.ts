export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export type Role = 'viewer' | 'editor' | 'reviewer' | 'admin';

export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface Document {
  id: string;
  title: string;
  content: string; // Could be structured JSON for a rich editor
  imageUrl?: string;
  authorId: string;
  authorName: string;
  reviewerId?: string;
  reviewerName?: string;
  status: ReviewStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  submittedAt?: string; // ISO date string
  reviewedAt?: string; // ISO date string
  rejectionReason?: string;
  version: number;
}

export interface DocumentHistoryEntry {
  id: string;
  timestamp: string; // ISO date string
  action: string; // e.g., "created", "submitted", "approved", "rejected", "edited", "reviewer_assigned"
  userId: string;
  userName: string;
  details?: Record<string, any>; // e.g., { reason: "Typo in section 2" }, { newReviewerId: "user123" }
}
