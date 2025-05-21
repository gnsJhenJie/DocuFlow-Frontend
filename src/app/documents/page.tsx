'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document, ReviewStatus } from '@/lib/types';
import { mockDocuments } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

export default function DocumentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('updatedAt_desc');

  useEffect(() => {
    // In a real app, fetch documents based on user, filters, and sort
    // For now, use mock data and client-side filtering/sorting
    console.log('[DocumentsPage] Fetching documents. User:', user?.id, 'Role:', user?.role);
    let filteredDocs = mockDocuments;

    if (user) {
      if (user.role === 'editor') {
        filteredDocs = mockDocuments.filter(doc => doc.authorId === user.id);
      } else if (user.role === 'reviewer') {
        // Show documents assigned to this reviewer or documents they authored if they also edit
         filteredDocs = mockDocuments.filter(doc => doc.reviewerId === user.id || doc.authorId === user.id);
      }
      // Admin sees all, viewer potentially sees all approved (adjust as needed)
    } else {
        filteredDocs = []; // No user, no documents
    }

    if (statusFilter !== 'all') {
      filteredDocs = filteredDocs.filter(doc => doc.status === statusFilter);
    }

    if (searchTerm) {
      filteredDocs = filteredDocs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    filteredDocs.sort((a, b) => {
      if (sortBy === 'updatedAt_desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'updatedAt_asc') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    setDocuments(filteredDocs);
  }, [user, searchTerm, statusFilter, sortBy]);

  useEffect(() => {
    const initialStatus = searchParams.get('status') as ReviewStatus | null;
    if (initialStatus && ['draft', 'pending_review', 'approved', 'rejected'].includes(initialStatus)) {
      setStatusFilter(initialStatus);
    }
  }, [searchParams]);


  if (!user) {
    return <p className="text-center mt-8">Please log in to view documents.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Documents</h1>
          <p className="text-muted-foreground">Manage, review, and track all your documents.</p>
        </div>
        {(user.role === 'editor' || user.role === 'admin') && (
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
              placeholder="Search documents..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReviewStatus | 'all')}>
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
            <label htmlFor="sortBy" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sortBy">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt_desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updatedAt_asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} currentUserRole={user.role} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Documents Found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by creating a new document.'}
          </p>
          {(user.role === 'editor' || user.role === 'admin') && !searchTerm && statusFilter === 'all' && (
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
