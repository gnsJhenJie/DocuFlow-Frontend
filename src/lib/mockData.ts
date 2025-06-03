import type { User, Document, Role, ReviewStatus } from "@/lib/types";

// Define a fixed reference point for mock dates to ensure consistency
const MOCK_REFERENCE_NOW = new Date("2024-07-20T12:00:00Z").getTime();

export const mockUsers: User[] = [
  {
    id: "user1",
    email: "alice@example.com",
    name: "Alice Wonderland",
    role: "admin",
    avatarUrl: "https://placehold.co/100x100.png",
  },
  {
    id: "user2",
    email: "bob@example.com",
    name: "Bob The Builder",
    role: "editor",
    avatarUrl: "https://placehold.co/100x100.png",
  },
  {
    id: "user3",
    email: "charlie@example.com",
    name: "Charlie Brown",
    role: "reviewer",
    avatarUrl: "https://placehold.co/100x100.png",
  },
  {
    id: "user4",
    email: "diana@example.com",
    name: "Diana Prince",
    role: "viewer",
    avatarUrl: "https://placehold.co/100x100.png",
  },
];

export const mockDocuments: Document[] = [
  {
    id: "doc1",
    title: "Q1 Marketing Strategy",
    content:
      "## Q1 Marketing Strategy\n\nThis document outlines the **marketing strategy** for the first quarter. \n\nIt includes:\n\n- An analysis of current market trends.\n- Target audience segmentation.\n- Key performance indicators (KPIs).\n\nWe will focus on *digital channels* and content marketing to drive engagement and lead generation.\n\n### Example Image\n![Placeholder chart for marketing data](https://placehold.co/400x200.png)\n*This is a placeholder image representing marketing data.*\n\n### Next Steps\n1. Finalize budget allocation.\n2. Launch social media campaigns.\n3. Monitor KPIs weekly.",
    authorId: "user2",
    authorName: "Bob The Builder",
    reviewerId: "user3",
    reviewerName: "Charlie Brown",
    status: "pending_review" as ReviewStatus,
    createdAt: new Date(
      MOCK_REFERENCE_NOW - 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(
      MOCK_REFERENCE_NOW - 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    submittedAt: new Date(
      MOCK_REFERENCE_NOW - 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    version: 1,
    imageUrl: "https://placehold.co/600x400.png",
  },
  {
    id: "doc2",
    title: "New Employee Onboarding Manual",
    content:
      "Welcome to the team! This manual provides essential information for new employees, covering company policies, team structure, available resources, and first-week expectations. Please read it carefully and reach out to HR with any questions.",
    authorId: "user1",
    authorName: "Alice Wonderland",
    status: "draft" as ReviewStatus,
    createdAt: new Date(
      MOCK_REFERENCE_NOW - 5 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(
      MOCK_REFERENCE_NOW - 1 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    version: 2,
  },
  {
    id: "doc3",
    title: "Technical Specification for Project Phoenix",
    content:
      "This document details the technical specifications for Project Phoenix. It covers system architecture, database design, API endpoints, and security considerations. The project aims to deliver a scalable and robust platform for our next-generation services.",
    authorId: "user2",
    authorName: "Bob The Builder",
    reviewerId: "user1",
    reviewerName: "Alice Wonderland",
    status: "approved" as ReviewStatus,
    createdAt: new Date(
      MOCK_REFERENCE_NOW - 10 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(
      MOCK_REFERENCE_NOW - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    submittedAt: new Date(
      MOCK_REFERENCE_NOW - 8 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    reviewedAt: new Date(
      MOCK_REFERENCE_NOW - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    version: 1,
    imageUrl: "https://placehold.co/600x400.png",
  },
  {
    id: "doc4",
    title: "Annual Financial Report",
    content:
      "The annual financial report summarizes the company's financial performance over the past fiscal year. It includes income statements, balance sheets, cash flow statements, and a detailed analysis by the CFO. Overall, the company has demonstrated strong growth and profitability.",
    authorId: "user1",
    authorName: "Alice Wonderland",
    reviewerId: "user3",
    reviewerName: "Charlie Brown",
    status: "rejected" as ReviewStatus,
    createdAt: new Date(
      MOCK_REFERENCE_NOW - 15 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updatedAt: new Date(
      MOCK_REFERENCE_NOW - 6 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    submittedAt: new Date(
      MOCK_REFERENCE_NOW - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    reviewedAt: new Date(
      MOCK_REFERENCE_NOW - 6 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    rejectionReason:
      "Missing appendix B and figures in section 3 are not up to date.",
    version: 1,
  },
];
