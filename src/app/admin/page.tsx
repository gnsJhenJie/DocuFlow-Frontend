'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminDocumentTable } from '@/components/admin/AdminDocumentTable';
import type { Document, ReviewStatus, User } from '@/lib/types';
import { mockDocuments, mockUsers } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Filter, UploadCloud, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>(mockDocuments); // Start with all mock documents
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('updatedAt_desc');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      console.log('[AdminPage] User not admin or not logged in, redirecting.');
      router.push('/'); // Redirect non-admins
      return;
    }
    console.log('[AdminPage] Admin user accessing page:', user.id);

    // Client-side filtering for demo
    let filteredDocs = mockDocuments;
    if (statusFilter !== 'all') {
      filteredDocs = filteredDocs.filter(doc => doc.status === statusFilter);
    }
    if (searchTerm) {
      filteredDocs = filteredDocs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.reviewerName && doc.reviewerName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    // Sorting (example)
    filteredDocs.sort((a, b) => {
      if (sortBy === 'updatedAt_desc') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      return 0;
    });
    setDocuments(filteredDocs);

  }, [user, router, searchTerm, statusFilter, sortBy]);

  const handleReassignReviewer = (documentId: string, newReviewerId: string) => {
    // Simulate API call
    setDocuments(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === documentId) {
          const newReviewer = mockUsers.find(u => u.id === newReviewerId);
          console.log(`[AdminPage] Reassigning reviewer for doc ${documentId} to ${newReviewer?.name}`);
          return { ...doc, reviewerId: newReviewerId, reviewerName: newReviewer?.name || 'N/A' };
        }
        return doc;
      })
    );
    // In a real app, update mockHistory or fetch new history
  };

  const handleViewHistory = (documentId: string) => {
    // For now, this just logs. In a real app, it might open a modal or navigate.
    console.log(`[AdminPage] Viewing history for document ${documentId}`);
    // Navigation to document detail page with history tab active is handled by AdminDocumentTable
  };


  if (!user || user.role !== 'admin') {
    return <p className="text-center mt-8">Access Denied. You must be an administrator to view this page.</p>;
  }
  
  const stats = {
    totalDocs: mockDocuments.length,
    pending: mockDocuments.filter(d => d.status === 'pending_review').length,
    approved: mockDocuments.filter(d => d.status === 'approved').length,
    users: mockUsers.length,
  };

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
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Optimal</div>
             <p className="text-xs text-muted-foreground">Placeholder for monitoring status</p>
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
                placeholder="Search by title, author, reviewer..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="adminStatusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReviewStatus | 'all')}>
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
                <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="adminSortBy">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="updatedAt_desc">Last Updated (Newest)</SelectItem>
                    <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                </SelectContent>
                </Select>
            </div>
            </div>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-semibold mb-4 mt-8">All Documents</h2>
      {documents.length > 0 ? (
        <AdminDocumentTable
          documents={documents}
          onReassignReviewer={handleReassignReviewer}
          onViewHistory={handleViewHistory}
        />
      ) : (
         <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Documents Match Filters</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
