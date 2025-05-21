'use client';

import { DocumentForm } from '@/components/documents/DocumentForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast'; // Assuming you have a toast hook
import type { Document } from '@/lib/types';

export default function NewDocumentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  if (!user) {
    // This should ideally be handled by a layout or middleware redirecting to login
    return <p className="text-center mt-8">Please log in to create a document.</p>;
  }

  if (user.role !== 'editor' && user.role !== 'admin') {
     return <p className="text-center mt-8 text-red-600">You do not have permission to create documents.</p>;
  }

  const handleSubmit = (data: any, action: 'save' | 'submit') => {
    // In a real app, this would interact with a backend/API or Firebase
    const newDocument: Partial<Document> = {
      ...data,
      id: `doc-${Date.now()}`, // Mock ID
      authorId: user.id,
      authorName: user.name,
      status: action === 'save' ? 'draft' : 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    if(action === 'submit') {
        newDocument.submittedAt = new Date().toISOString();
    }

    console.log(`[NewDocumentPage] ${action === 'save' ? 'Saving draft' : 'Submitting document'}:`, newDocument);

    // Simulate API call
    toast({
      title: `Document ${action === 'save' ? 'Draft Saved' : 'Submitted'}`,
      description: `"${data.title}" has been successfully ${action === 'save' ? 'saved as a draft' : 'submitted for review'}.`,
    });
    
    // Add to mockData or update state if managing client-side for demo
    // For example: import { mockDocuments } from '@/lib/mockData'; mockDocuments.push(newDocument as Document);

    router.push(`/documents/${newDocument.id}`); // Redirect to the new document's page or document list
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <DocumentForm currentUser={user} onSubmit={handleSubmit} onCancel={() => router.push('/documents')} />
    </div>
  );
}
