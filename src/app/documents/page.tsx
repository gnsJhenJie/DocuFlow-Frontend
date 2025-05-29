'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';
import type { Document, ReviewStatus, PaginatedDocumentsResponse } from '@/lib/types';
import { DocumentCard } from '@/components/documents/DocumentCard';

const DOCUMENTS_PER_PAGE = 9;

export default function DocumentsPage() {
  const searchParams = useSearchParams();

  // Local state for filters and pagination
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('searchTerm') || '');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>(
    (searchParams.get('status') as ReviewStatus | 'all') || 'all'
  );
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'updatedAt_desc');
  const [viewFilter, setViewFilter] = useState<string | null>(searchParams.get('view'));
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get('page') || '1', 10)
  );

  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync URL params -> state
  useEffect(() => {
    const params = searchParams;
    const newSearch = params.get('searchTerm') || '';
    const newStatus = (params.get('status') as ReviewStatus) || 'all';
    const newSort = params.get('sortBy') || 'updatedAt_desc';
    const newView = params.get('view');
    const newPage = parseInt(params.get('page') || '1', 10);

    if (newSearch !== searchTerm) setSearchTerm(newSearch);
    if (newStatus !== statusFilter) setStatusFilter(newStatus);
    if (newSort !== sortBy) setSortBy(newSort);
    if (newView !== viewFilter) setViewFilter(newView);
    if (newPage !== currentPage) setCurrentPage(newPage);
  }, [searchParams]);

  // Build API query params
  const buildApiParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', DOCUMENTS_PER_PAGE.toString());
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (sortBy) params.set('sortBy', sortBy);
    if (viewFilter === 'pending_my_review') {
      params.set('view', 'pending_my_review');
    } else if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    return params;
  }, [currentPage, searchTerm, sortBy, statusFilter, viewFilter]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildApiParams();
      const data: PaginatedDocumentsResponse = await apiClient.getDocuments(params);
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiParams]);

  // Update URL and fetch whenever filters/page change
  useEffect(() => {
    const params = buildApiParams();
    // Always push new history entry, even if same params
    window.history.pushState({}, '', `/documents?${params.toString()}`);
    fetchDocuments();
  }, [searchTerm, statusFilter, sortBy, viewFilter, currentPage]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | 'all')}
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-2">
          <Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
}