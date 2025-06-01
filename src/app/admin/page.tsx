
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminDocumentTable } from '@/components/admin/AdminDocumentTable';
import type { Document, ReviewStatus, User, PaginatedDocumentsResponse } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Filter, UploadCloud, Users, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

const DOCUMENTS_PER_PAGE = 10;

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchTerm') || '');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>(
    (searchParams.get('status') as ReviewStatus | 'all') || 'all'
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'updatedAt_desc');
  
  const [stats, setStats] = useState({
    totalDocs: 0,
    pending: 0,
    approved: 0,
    users: 0,
  });

  const buildApiParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('limit', String(DOCUMENTS_PER_PAGE));
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (sortBy) params.append('sortBy', sortBy);
    // Admin sees all, no author/reviewer specific filters needed by default here
    return params;
  }, [currentPage, searchTerm, statusFilter, sortBy]);

  const fetchAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin' || authLoading) return;
    setIsLoading(true);
    try {
      const params = buildApiParams();
      // Fetch documents and users in parallel
      const [docsResponse, usersResponse] = await Promise.all([
        apiClient.getDocuments(params),
        apiClient.getUsers() // Assuming this fetches all users for stats
      ]);
      
      setDocuments(docsResponse.documents);
      setTotalPages(docsResponse.totalPages);
      setCurrentPage(docsResponse.currentPage); // Ensure current page from API is respected
      setAllUsers(usersResponse);

      // Calculate stats based on potentially all documents (not just current page)
      // For accurate stats, we might need separate API endpoints or fetch all docs (not recommended for large datasets)
      // For now, using usersResponse.length for user count. Document stats might be approximate.
      // A better approach for stats would be dedicated API endpoints.
      // Simulating stats based on current documents for now:
      const allDocsForStats = await apiClient.getDocuments(new URLSearchParams({limit: '1000'})); // Fetch a larger set for stats; not ideal.
      setStats({
        totalDocs: allDocsForStats.documents.length, // Or a dedicated API endpoint for total count
        pending: allDocsForStats.documents.filter(d => d.status === 'pending_review').length,
        approved: allDocsForStats.documents.filter(d => d.status === 'approved').length,
        users: usersResponse.length,
      });

    } catch (error: any) {
      toast({
        title: 'Error Fetching Admin Data',
        description: error.message || 'Could not load administrator data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, buildApiParams, toast]);

  // 把一個「父元件用來告訴 fetch 新名單」的 callback 傳下去
  const handleDocumentsChanged = () => {
    // 這裡就只是再跑一次 fetchAdminData
    fetchAdminData();
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      console.log('[AdminPage] User not admin or not logged in, redirecting.');
      router.push('/');
      return;
    }
    fetchAdminData();
  }, [user, authLoading, router, fetchAdminData]);

  useEffect(() => {
    // Update URL when filters change
    const params = new URLSearchParams();
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sortBy !== 'updatedAt_desc') params.set('sortBy', sortBy);
    if (currentPage > 1) params.set('page', String(currentPage));
    router.push(`/admin?${params.toString()}`, { scroll: false });
  }, [searchTerm, statusFilter, sortBy, currentPage, router]);


  const handleReassignReviewer = async (documentId: string, newReviewerIdStr: string) => {
    const newReviewerId = parseInt(newReviewerIdStr, 10);
    if (isNaN(newReviewerId)) {
        toast({ title: "Invalid Reviewer ID", variant: "destructive"});
        return;
    }
    try {
      await apiClient.reassignReviewer(documentId, newReviewerId);
      toast({
        title: "Reviewer Reassigned",
        description: `Reviewer for document updated.`,
      });
      fetchAdminData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error Reassigning Reviewer",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (authLoading || (!user && !isLoading) /* initial load before redirect */) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }
  if (!user || user.role !== 'admin') {
    // This might be briefly visible or not at all if redirection is fast
    // Or if fetchCurrentUser in AuthContext already redirected.
    return <p className="text-center mt-8">Access Denied. You must be an administrator to view this page.</p>;
  }
  

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Administrator Dashboard</h1>
        <p className="text-muted-foreground">Oversee all documents, users, and system activity.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <UploadCloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Documents</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.approved}</div>
            <p className="text-xs text-muted-foreground">Published and accessible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.pending}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.users}</div>
          </CardContent>
        </Card>
      </div>


      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle>Document Filters</CardTitle>
          <CardDescription>Refine the list of documents shown below.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by title, content, author, reviewer..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                />
            </div>
            <div>
                <label htmlFor="adminStatusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <Select value={statusFilter} onValueChange={(value) => {setStatusFilter(value as ReviewStatus | 'all'); setCurrentPage(1);}}>
                <SelectTrigger id="adminStatusFilter">
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
                 <label htmlFor="adminSortBy" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
                <Select value={sortBy} onValueChange={(val) => {setSortBy(val); setCurrentPage(1);}}>
                <SelectTrigger id="adminSortBy">
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
        </CardContent>
      </Card>

      <h2 className="text-2xl font-semibold mb-4 mt-8">All Documents</h2>
      {isLoading && documents.length === 0 ? ( // Initial loading state for table
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>)}
        </div>
      ) : !isLoading && documents.length === 0 ? (
         <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Documents Match Filters</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <>
        <AdminDocumentTable
          documents={documents}
          onReassignReviewer={handleReassignReviewer}
          onViewHistory={(docId) => router.push(`/documents/view?id=${docId}&tab=history`)} // Simplified
          onDocumentsChanged={handleDocumentsChanged}
          isLoading={isLoading && documents.length > 0} // Pass loading for subsequent loads
        />
        {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || isLoading}>Previous</Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || isLoading}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
