
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DocumentForm } from '@/components/documents/DocumentForm';
import { ReviewActions } from '@/components/documents/ReviewActions';
import type { Document, DocumentHistoryEntry, User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Edit3, Eye, Clock, CheckCircle2, XCircle, MessageSquare, ShieldCheck, Send, FileText, History, AlertTriangle, Loader2 } from 'lucide-react';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '@/lib/apiClient';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [document, setDocument] = useState<Document | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const docId = params.id as string;
  const initialEditMode = searchParams.get('edit') === 'true';
  const initialReviewMode = searchParams.get('review') === 'true';
  const initialTab = searchParams.get('tab') || 'details';

  const [isEditing, setIsEditing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);


  const fetchDocumentData = useCallback(async () => {
    if (!docId || authLoading) return;
    setLoading(true);
    try {
      const [docData, historyData] = await Promise.all([
        apiClient.getDocumentById(docId),
        apiClient.getDocumentHistory(docId)
      ]);
      setDocument(docData);
      setDocumentHistory(historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      // Set initial editing/reviewing state based on fetched doc and user
      if(docData && user){
        const canEdit = (user.role === 'admin' || docData.authorId === user.id) && (docData.status === 'draft' || docData.status === 'rejected' || (docData.status === 'approved' && user.role !== 'viewer'));
        const canReview = (user.role === 'admin' || docData.reviewerId === user.id) && docData.status === 'pending_review';

        if(initialEditMode && canEdit){
            setIsEditing(true);
        } else {
            setIsEditing(false);
        }
        if(initialReviewMode && canReview){
            setIsReviewing(true);
            if (activeTab !== 'reviewActions') setActiveTab('reviewActions'); // Switch to review tab
        } else {
            setIsReviewing(false);
        }
      }

    } catch (error: any) {
      console.error(`[DocumentDetailPage] Error fetching document ${docId}:`, error);
      setDocument(null); // Set to null to show "not found"
      toast({ title: 'Error', description: error.message || 'Failed to load document.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [docId, user, authLoading, toast, initialEditMode, initialReviewMode, activeTab]);

  useEffect(() => {
    fetchDocumentData();
  }, [fetchDocumentData]);
  
  useEffect(() => {
    // Sync URL with editing/reviewing state
    const newParams = new URLSearchParams(searchParams.toString());
    if (isEditing) newParams.set('edit', 'true'); else newParams.delete('edit');
    if (isReviewing) newParams.set('review', 'true'); else newParams.delete('review');
    if (activeTab !== 'details') newParams.set('tab', activeTab); else newParams.delete('tab');
    
    if (newParams.toString() !== searchParams.toString().split('?')[1]) {
     router.replace(`/documents/${docId}?${newParams.toString()}`, { scroll: false });
    }
  }, [isEditing, isReviewing, activeTab, docId, router, searchParams]);


  const handleFormSubmit = async (data: any, action: 'save_draft' | 'resubmit_for_review') => {
    if (!document || !user) return;

    const payload: any = {
      title: data.title,
      content: data.content,
      action: action, // API expects 'save_draft' or 'resubmit_for_review' for PUT
    };
    if (data.imageUrl) payload.imageUrl = data.imageUrl;
    if (action === 'resubmit_for_review') {
      if (!data.reviewerId) {
        toast({ title: "Reviewer Required", description: "Please select a reviewer before resubmitting.", variant: "destructive" });
        return;
      }
      payload.reviewerId = parseInt(data.reviewerId, 10); // API expects number
       if (isNaN(payload.reviewerId)) {
            toast({ title: "Invalid Reviewer", description: "Reviewer ID is not valid.", variant: "destructive" });
            return;
        }
    }

    try {
      const updatedDocument = await apiClient.updateDocument(document.id, payload);
      setDocument(updatedDocument);
      // Fetch history again to get the latest entry
      const historyData = await apiClient.getDocumentHistory(document.id);
      setDocumentHistory(historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setIsEditing(false);
      setActiveTab('details');
      toast({
        title: `Document ${action === 'save_draft' ? 'Draft Saved' : 'Resubmitted'}`,
        description: `"${updatedDocument.title}" has been updated.`,
      });
    } catch (error: any) {
      toast({ title: 'Error Updating Document', description: error.message, variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    if (!document || !user) return;
    try {
      const approvedDocument = await apiClient.approveDocument(document.id);
      setDocument(approvedDocument);
      const historyData = await apiClient.getDocumentHistory(document.id);
      setDocumentHistory(historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setIsReviewing(false);
      setActiveTab('details');
      toast({ title: "Document Approved", description: `"${approvedDocument.title}" has been approved.` });
    } catch (error: any) {
      toast({ title: 'Error Approving Document', description: error.message, variant: 'destructive' });
    }
  };

  const handleReject = async (reason: string) => {
    if (!document || !user) return;
    try {
      const rejectedDocument = await apiClient.rejectDocument(document.id, reason);
      setDocument(rejectedDocument);
      const historyData = await apiClient.getDocumentHistory(document.id);
      setDocumentHistory(historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setIsReviewing(false);
      setActiveTab('details');
      toast({ title: "Document Rejected", description: `"${rejectedDocument.title}" has been rejected.` });
    } catch (error: any) {
      toast({ title: 'Error Rejecting Document', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'reviewActions') {
        setIsReviewing(true); // Also set reviewing state if not already
    } else if (isReviewing && value !== 'reviewActions') {
        // if navigating away from review tab while in review mode, turn off review mode
        // but only if this tab change wasn't initiated by Review button itself
    }
  };


  if (authLoading || loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading document...</p></div>;
  if (!document && !loading) return <div className="text-center mt-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4 text-xl">Document not found.</p><Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button></div>;
  if (!user) return <p className="text-center mt-8">Please log in to view this document.</p>;
  if (!document) return null; // Should be caught by above


  const canEditDocument = (user.role === 'admin' || document.authorId === user.id) && (document.status === 'draft' || document.status === 'rejected' || (document.status === 'approved' && user.role !== 'viewer'));
  const canPerformReview = (user.role === 'admin' || (document.reviewerId && document.reviewerId === user.id)) && document.status === 'pending_review';

  if (isEditing && canEditDocument) {
    return (
      <DocumentForm
        document={document}
        currentUser={user}
        onSubmit={handleFormSubmit}
        onCancel={() => {setIsEditing(false); setActiveTab('details');}}
        formMode="edit"
      />
    );
  }
  
  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('created')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (action.toLowerCase().includes('submit') || action.toLowerCase().includes('resubmit')) return <Send className="h-4 w-4 text-purple-500" />;
    if (action.toLowerCase().includes('approve')) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (action.toLowerCase().includes('reject')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (action.toLowerCase().includes('edit')) return <Edit3 className="h-4 w-4 text-yellow-500" />;
    if (action.toLowerCase().includes('assign')) return <User className="h-4 w-4 text-orange-500" />;
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 m-2 md:m-4">
            <TabsTrigger value="details"><Eye className="mr-2 h-4 w-4" />Details</TabsTrigger>
            <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
            {(canPerformReview || isReviewing) && <TabsTrigger value="reviewActions"><ShieldCheck className="mr-2 h-4 w-4" />Review</TabsTrigger>}
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

            <article className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none p-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
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
                                    <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span> 
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

          {(canPerformReview || isReviewing) && ( // Show tab content if user can review OR is already in reviewing mode from query param
            <TabsContent value="reviewActions" className="p-2 md:p-6">
                 <h3 className="text-xl font-semibold mb-4">Review Actions</h3>
                 { canPerformReview ? (
                    <>
                        <p className="text-muted-foreground mb-4">As the assigned reviewer, you can approve or reject this document.</p>
                        <ReviewActions
                            documentId={document.id}
                            documentTitle={document.title}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    </> ) : (
                        <p className="text-muted-foreground">You are not the assigned reviewer or the document is not pending review.</p>
                    )
                 }
            </TabsContent>
          )}

        </Tabs>

        <CardFooter className="border-t pt-6 flex flex-wrap justify-end gap-3">
          {canEditDocument && !isEditing && (
            <Button onClick={() => {setIsEditing(true); setActiveTab('details');}} variant="secondary">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Document
            </Button>
          )}
          {canPerformReview && !isReviewing && ( // Only show Review button if not already in review mode via tab/URL
             <Button onClick={() => {setIsReviewing(true); setActiveTab('reviewActions');}} variant="default" className="bg-accent hover:bg-accent/90">
              <ShieldCheck className="mr-2 h-4 w-4" /> Review Document
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
