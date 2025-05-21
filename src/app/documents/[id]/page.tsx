
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DocumentForm } from '@/components/documents/DocumentForm';
import { ReviewActions } from '@/components/documents/ReviewActions';
import type { Document, DocumentHistoryEntry } from '@/lib/types';
import { mockDocuments, mockUsers } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Edit3, Eye, Clock, CheckCircle2, XCircle, MessageSquare, ShieldCheck, Send, FileText, History, AlertTriangle } from 'lucide-react';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Define a fixed reference point for mock dates to ensure consistency
const MOCK_HISTORY_REFERENCE_NOW = new Date('2024-07-20T12:00:00Z').getTime();

// Mock history data
const mockHistory: Record<string, DocumentHistoryEntry[]> = {
    'doc1': [
        { id: 'hist1-1', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 3 * 24 * 60 * 60 * 1000).toISOString(), action: 'created', userId: 'user2', userName: 'Bob The Builder' },
        { id: 'hist1-2', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 2 * 24 * 60 * 60 * 1000).toISOString(), action: 'submitted', userId: 'user2', userName: 'Bob The Builder', details: { reviewer: 'Charlie Brown' } },
    ],
    'doc3': [
        { id: 'hist3-1', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 10 * 24 * 60 * 60 * 1000).toISOString(), action: 'created', userId: 'user2', userName: 'Bob The Builder' },
        { id: 'hist3-2', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 8 * 24 * 60 * 60 * 1000).toISOString(), action: 'submitted', userId: 'user2', userName: 'Bob The Builder', details: { reviewer: 'Alice Wonderland' } },
        { id: 'hist3-3', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 7 * 24 * 60 * 60 * 1000).toISOString(), action: 'approved', userId: 'user1', userName: 'Alice Wonderland' },
    ],
     'doc4': [
        { id: 'hist4-1', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 15 * 24 * 60 * 60 * 1000).toISOString(), action: 'created', userId: 'user1', userName: 'Alice Wonderland' },
        { id: 'hist4-2', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 7 * 24 * 60 * 60 * 1000).toISOString(), action: 'submitted', userId: 'user1', userName: 'Alice Wonderland', details: { reviewer: 'Charlie Brown' } },
        { id: 'hist4-3', timestamp: new Date(MOCK_HISTORY_REFERENCE_NOW - 6 * 24 * 60 * 60 * 1000).toISOString(), action: 'rejected', userId: 'user3', userName: 'Charlie Brown', details: { reason: 'Missing appendix B and figures in section 3 are not up to date.' } },
    ]
};


export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [document, setDocument] = useState<Document | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [isReviewing, setIsReviewing] = useState(searchParams.get('review') === 'true');


  useEffect(() => {
    const docId = params.id as string;
    if (docId) {
      console.log(`[DocumentDetailPage] Fetching document with ID: ${docId}`);
      // Simulate API call
      const foundDocument = mockDocuments.find(d => d.id === docId);
      setDocument(foundDocument || null);
      setDocumentHistory(mockHistory[docId] || []);
      setLoading(false);

      if(foundDocument && user){
        // Automatically set editing or reviewing if conditions met from query params
        if(searchParams.get('edit') === 'true' && (foundDocument.authorId === user.id || user.role === 'admin') && (foundDocument.status === 'draft' || foundDocument.status === 'rejected')){
            setIsEditing(true);
        } else {
            setIsEditing(false); // Clear edit mode if not applicable
        }
        if(searchParams.get('review') === 'true' && (foundDocument.reviewerId === user.id || user.role === 'admin') && foundDocument.status === 'pending_review'){
            setIsReviewing(true);
        } else {
            setIsReviewing(false); // Clear review mode
        }
      }
    }
  }, [params.id, user, searchParams]);

  const handleFormSubmit = (data: any, action: 'save' | 'submit') => {
    if (!document || !user) return;

    const updatedDocument: Document = {
      ...document,
      ...data,
      status: action === 'save' ? 'draft' : 'pending_review',
      updatedAt: new Date().toISOString(), // Keep this as current time for updates
      version: document.version + (document.status === 'approved' ? 1 : 0), // Increment version if editing an approved doc
    };
     if (action === 'submit') {
        updatedDocument.submittedAt = new Date().toISOString(); // Keep this as current time
        // In real app, assign reviewerId from data.reviewerId
        const reviewer = mockUsers.find(u => u.id === data.reviewerId);
        updatedDocument.reviewerName = reviewer?.name;
    }


    // Simulate update
    const docIndex = mockDocuments.findIndex(d => d.id === document.id);
    if (docIndex > -1) mockDocuments[docIndex] = updatedDocument;

    console.log(`[DocumentDetailPage] Document ${action}:`, updatedDocument);
    setDocument(updatedDocument);
    setIsEditing(false);
    toast({
      title: `Document ${action === 'save' ? 'Draft Saved' : 'Submitted'}`,
      description: `"${updatedDocument.title}" has been updated.`,
    });
     // Add to history
    const historyEntry: DocumentHistoryEntry = {
        id: `hist-${Date.now()}`, // This is fine for new entries
        timestamp: new Date().toISOString(), // Current time for new action
        action: action === 'save' ? `edited (v${updatedDocument.version})` : `resubmitted (v${updatedDocument.version})`,
        userId: user.id,
        userName: user.name,
        details: action === 'submit' ? { reviewer: updatedDocument.reviewerName } : undefined,
    };
    setDocumentHistory(prev => [historyEntry, ...prev]);
    if (mockHistory[document.id]) {
        mockHistory[document.id].unshift(historyEntry);
    } else {
        mockHistory[document.id] = [historyEntry];
    }
  };

  const handleApprove = () => {
    if (!document || !user) return;
    const approvedDocument: Document = { ...document, status: 'approved', reviewedAt: new Date().toISOString() };
    
    const docIndex = mockDocuments.findIndex(d => d.id === document.id);
    if (docIndex > -1) mockDocuments[docIndex] = approvedDocument;

    setDocument(approvedDocument);
    setIsReviewing(false);
    console.log(`[DocumentDetailPage] Document approved by ${user.id}:`, approvedDocument);
     // Add to history
    const historyEntry: DocumentHistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'approved',
        userId: user.id,
        userName: user.name,
    };
    setDocumentHistory(prev => [historyEntry, ...prev]);
    mockHistory[document.id]?.unshift(historyEntry);
  };

  const handleReject = (reason: string) => {
    if (!document || !user) return;
    const rejectedDocument: Document = { ...document, status: 'rejected', rejectionReason: reason, reviewedAt: new Date().toISOString() };

    const docIndex = mockDocuments.findIndex(d => d.id === document.id);
    if (docIndex > -1) mockDocuments[docIndex] = rejectedDocument;
    
    setDocument(rejectedDocument);
    setIsReviewing(false);
    console.log(`[DocumentDetailPage] Document rejected by ${user.id} with reason: ${reason}:`, rejectedDocument);
    // Add to history
    const historyEntry: DocumentHistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'rejected',
        userId: user.id,
        userName: user.name,
        details: { reason }
    };
    setDocumentHistory(prev => [historyEntry, ...prev]);
    mockHistory[document.id]?.unshift(historyEntry);
  };


  if (loading) return <div className="flex justify-center items-center h-64"><Clock className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading document...</p></div>;
  if (!document) return <div className="text-center mt-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4 text-xl">Document not found.</p><Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button></div>;
  if (!user) return <p className="text-center mt-8">Please log in to view this document.</p>;


  const canEditDocument = (user.role === 'admin' || document.authorId === user.id) && (document.status === 'draft' || document.status === 'rejected' || (document.status === 'approved' && user.role !== 'viewer'));
  const canInitiateReview = (user.role === 'admin' || document.authorId === user.id) && (document.status === 'draft' || document.status === 'rejected');
  const canPerformReview = (user.role === 'admin' || document.reviewerId === user.id) && document.status === 'pending_review';

  if (isEditing && canEditDocument) {
    return (
      <DocumentForm
        document={document}
        currentUser={user}
        onSubmit={handleFormSubmit}
        onCancel={() => {setIsEditing(false); router.replace(`/documents/${document.id}`);}}
      />
    );
  }
  
  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (action.includes('submitted') || action.includes('resubmitted')) return <Send className="h-4 w-4 text-purple-500" />;
    if (action.includes('approved')) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (action.includes('rejected')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (action.includes('edited')) return <Edit3 className="h-4 w-4 text-yellow-500" />;
    return <History className="h-4 w-4 text-gray-500" />;
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
      </Button>

      <Card className="overflow-hidden shadow-xl">
        {document.imageUrl && !isEditing && (
          <div className="relative h-64 md:h-96 w-full">
            <Image src={document.imageUrl} alt={document.title} layout="fill" objectFit="cover" data-ai-hint="document banner" />
          </div>
        )}
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
                <CardTitle className="text-3xl font-bold">{document.title}</CardTitle>
                <CardDescription className="text-sm mt-1">
                    Authored by: {document.authorName} | Version: {document.version} | Last updated: {format(new Date(document.updatedAt), "PPP p")}
                </CardDescription>
            </div>
            <DocumentStatusBadge status={document.status} />
          </div>
        </CardHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 m-2 md:m-4">
            <TabsTrigger value="details"><Eye className="mr-2 h-4 w-4" />Details</TabsTrigger>
            <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
            {canPerformReview && isReviewing && <TabsTrigger value="reviewActions"><ShieldCheck className="mr-2 h-4 w-4" />Review</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="details" className="p-2 md:p-6">
             {document.status === 'rejected' && document.rejectionReason && (
                <Alert variant="destructive" className="mb-6">
                  <MessageSquare className="h-4 w-4" />
                  <AlertTitle>Rejected on {document.reviewedAt ? format(new Date(document.reviewedAt), "PPP") : 'N/A'} by {document.reviewerName || 'Reviewer'}</AlertTitle>
                  <AlertDescription>Reason: {document.rejectionReason}</AlertDescription>
                </Alert>
            )}
            {document.status === 'pending_review' && (
                 <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-300 text-yellow-700">
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Pending Review</AlertTitle>
                    <AlertDescription>This document was submitted on {document.submittedAt ? format(new Date(document.submittedAt), "PPP") : 'N/A'} and is awaiting review from {document.reviewerName || 'the assigned reviewer'}.</AlertDescription>
                </Alert>
            )}
             {document.status === 'approved' && (
                 <Alert variant="default" className="mb-6 bg-green-50 border-green-300 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Approved</AlertTitle>
                    <AlertDescription>This document was approved on {document.reviewedAt ? format(new Date(document.reviewedAt), "PPP") : 'N/A'} by {document.reviewerName || 'Reviewer'}.</AlertDescription>
                </Alert>
            )}

            <article className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none break-words whitespace-pre-wrap p-1">
              {document.content}
            </article>
          </TabsContent>

          <TabsContent value="history" className="p-2 md:p-6">
            <h3 className="text-xl font-semibold mb-4">Document History</h3>
            {documentHistory.length > 0 ? (
                <ScrollArea className="h-[300px] rounded-md border p-2">
                    <ul className="space-y-3">
                    {documentHistory.map(entry => (
                        <li key={entry.id} className="p-3 bg-muted/50 rounded-md shadow-sm">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {getActionIcon(entry.action)}
                                    <span className="font-medium capitalize">{entry.action}</span> 
                                    <span>by {entry.userName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), "PPP p")}</span>
                            </div>
                            {entry.details && (
                                <div className="mt-1.5 pl-6 text-xs text-muted-foreground">
                                    {Object.entries(entry.details).map(([key, value]) => (
                                        <p key={key}><strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {String(value)}</p>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                    </ul>
                </ScrollArea>
            ) : <p>No history available for this document.</p>}
          </TabsContent>

          {canPerformReview && isReviewing && (
            <TabsContent value="reviewActions" className="p-2 md:p-6">
                 <h3 className="text-xl font-semibold mb-4">Review Actions</h3>
                 <p className="text-muted-foreground mb-4">As the assigned reviewer, you can approve or reject this document.</p>
                 <ReviewActions
                    documentId={document.id}
                    documentTitle={document.title}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
            </TabsContent>
          )}

        </Tabs>

        <CardFooter className="border-t pt-6 flex flex-wrap justify-end gap-3">
          {canEditDocument && !isEditing && (
            <Button onClick={() => {setIsEditing(true); router.push(`/documents/${document.id}?edit=true`);}} variant="secondary">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Document
            </Button>
          )}
          {canPerformReview && !isReviewing && (
             <Button onClick={() => {setIsReviewing(true); router.push(`/documents/${document.id}?review=true`);}} variant="default" className="bg-accent hover:bg-accent/90">
              <ShieldCheck className="mr-2 h-4 w-4" /> Review Document
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


    
