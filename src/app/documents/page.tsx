'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type {
  Document,
  ReviewStatus,
  PaginatedDocumentsResponse,
} from '@/lib/types';
import Link from 'next/link';
import {
  PlusCircle,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const DOCUMENTS_PER_PAGE = 9;

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('updatedAt_desc');
  const [viewFilter, setViewFilter] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1) 解析 URL，保留 my_documents 的 status
  useEffect(() => {
    const newSearchTerm = searchParams.get('searchTerm') || '';
    const newSortBy = searchParams.get('sortBy') || 'updatedAt_desc';
    const newView = searchParams.get('view');
    const newPage = parseInt(searchParams.get('page') || '1', 10);
    const rawStatus = (searchParams.get('status') as ReviewStatus | 'all') || 'all';

    // 默认用 URL 里的 status，pending_my_review 特殊映射
    let effectiveStatus = rawStatus;
    if (newView === 'pending_my_review') {
      effectiveStatus = 'pending_review';
    }

    setSearchTerm(newSearchTerm);
    setSortBy(newSortBy);
    setViewFilter(newView);
    setStatusFilter(effectiveStatus);
    setCurrentPage(newPage);
    setIsInitialized(true);
  }, [searchParams]);

  // 2) 构建 API 请求参数，my_documents 分支也带上 status
  const buildApiParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('limit', String(DOCUMENTS_PER_PAGE));
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (sortBy) params.append('sortBy', sortBy);

    if (viewFilter === 'pending_my_review' && user) {
      params.set('view', 'pending_my_review');
      params.set('reviewerId', user.id);
      params.set('status', 'pending_review');
    } else if (viewFilter === 'my_documents' && user) {
      params.set('view', 'my_documents');
      params.set('authorId', user.id);
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
    } else if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    return params;
  }, [currentPage, searchTerm, sortBy, statusFilter, viewFilter, user]);

  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== deletedId));
  };
  
  const fetchDocuments = useCallback(async () => {
    if (!user || authLoading) return;
    setIsLoading(true);
    try {
      const params = buildApiParams();
      const data: PaginatedDocumentsResponse = await apiClient.getDocuments(params);
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (error: any) {
      toast({
        title: 'Error Fetching Documents',
        description: error.message || 'Could not load documents.',
        variant: 'destructive',
      });
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, buildApiParams, toast]);

  // 同步 URL 并拉数据
  useEffect(() => {
    if (!isInitialized) return;
    const params = new URLSearchParams();
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (viewFilter === 'pending_my_review') {
      params.set('view', 'pending_my_review');
    } else if (viewFilter === 'my_documents') {
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('view', 'my_documents');
    } else {
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (viewFilter) params.set('view', viewFilter);
    }
    if (sortBy !== 'updatedAt_desc') params.set('sortBy', sortBy);
    if (currentPage > 1) params.set('page', String(currentPage));

    const finalQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (finalQuery !== currentQuery) {
      router.push(`/documents?${finalQuery}`, { scroll: false });
    }
    fetchDocuments();
  }, [fetchDocuments, searchTerm, statusFilter, sortBy, viewFilter, currentPage, isInitialized]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return <p className="text-center mt-8">Please log in to view documents.</p>;
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleStatusFilterChange = (value: string) => {
    const newStatus = value as ReviewStatus | 'all';
    setStatusFilter(newStatus);
    setCurrentPage(1);
    if (viewFilter === 'pending_my_review' && newStatus !== 'pending_review') {
      setViewFilter(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {viewFilter === 'pending_my_review'
              ? 'Documents Pending Your Review'
              : viewFilter === 'my_documents'
              ? 'My Documents'
              : statusFilter !== 'all'
              ? `${statusFilter.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Documents`
              : 'All Documents'}
          </h1>
          <p className="text-muted-foreground">
            Manage, review, and track all your documents.
          </p>
        </div>
        {(user.role !== 'viewer') && (
          <Link href="/documents/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Document
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 p-4 bg-card border rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title, content, author, reviewer..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label
              htmlFor="statusFilter"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
              disabled={viewFilter === 'pending_my_review'}
            >
              <SelectTrigger id="statusFilter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="sortBy"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Sort By
            </label>
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger id="sortBy">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt_desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updatedAt_asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(DOCUMENTS_PER_PAGE)].map((_, i) => (
            <div key={i} className="bg-card p-4 rounded-lg shadow">
              <div className="h-48 bg-muted rounded animate-pulse mb-4"></div>
              <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse mb-4"></div>
              <div className="h-8 w-full bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : documents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                currentUser={user}
                onDeleteSuccess={handleDocumentDeleted}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Documents Found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || viewFilter
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating a new document.'}
          </p>
          {(user.role === 'editor' || user.role === 'admin') &&
            !searchTerm &&
            statusFilter === 'all' &&
            !viewFilter && (
              <Link href="/documents/new" className="mt-4 inline-block">
                <Button variant="default">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create First Document
                </Button>
              </Link>
            )}
        </div>
      )}
    </div>
  );
}
