'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DocumentForm } from '@/components/documents/DocumentForm';
import { ReviewActions } from '@/components/documents/ReviewActions';
import type { Document, DocumentHistoryEntry, User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Edit3, Eye, Clock, CheckCircle2, XCircle, MessageSquare, ShieldCheck, Send, FileText, History, AlertTriangle, Loader2, User as UserIcon } from 'lucide-react';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '@/lib/apiClient';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [document, setDocument] = useState<Document | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const docId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Read initial query parameters once on mount
  useEffect(() => {
    const q = Object.fromEntries(new URLSearchParams(window.location.search));
    if (q.edit === 'true') setIsEditing(true);
    if (q.review === 'true') setIsReviewing(true);
    if (q.tab) setActiveTab(q.tab as string);
  }, []);

  // Fetch document and history
  const fetchDocumentData = useCallback(async () => {
    if (!docId || authLoading) return;
    setLoading(true);
    try {
      const [docData, historyData] = await Promise.all([
        apiClient.getDocumentById(docId),
        apiClient.getDocumentHistory(docId),
      ]);
      setDocument(docData);
      setDocumentHistory(
        historyData.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    } catch (error: any) {
      console.error('Error fetching document:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [docId, authLoading, toast]);

  useEffect(() => {
    fetchDocumentData();
  }, [fetchDocumentData]);

  // Handlers for updating URL and state without router.replace loops
  const handleEditClick = () => {
    window.history.replaceState(null, '', `/documents/${docId}?edit=true`);
    setIsEditing(true);
    setActiveTab('details');
  };

  const handleReviewClick = () => {
    window.history.replaceState(
      null,
      '',
      `/documents/${docId}?review=true&tab=reviewActions`
    );
    setIsReviewing(true);
    setActiveTab('reviewActions');
  };

  const handleTabChange = (newTab: string) => {
    const q = new URLSearchParams();
    if (isEditing) q.set('edit', 'true');
    if (isReviewing) q.set('review', 'true');
    if (newTab !== 'details') q.set('tab', newTab);
    window.history.replaceState(null, '', `/documents/${docId}?${q.toString()}`);
    setActiveTab(newTab);
    if (newTab === 'reviewActions') setIsReviewing(true);
  };

  const handleFormSubmit = async (
    data: any,
    action: 'save_draft' | 'resubmit_for_review'
  ) => {
    if (!document || !user) return;
    const payload: any = { title: data.title, content: data.content, action };
    if (data.imageUrl) payload.imageUrl = data.imageUrl;
    if (action === 'resubmit_for_review') {
      if (!data.reviewerId) {
        toast({
          title: 'Reviewer Required',
          description: 'Please select a reviewer.',
          variant: 'destructive',
        });
        return;
      }
      payload.reviewerId = parseInt(data.reviewerId, 10);
    }
    try {
      const updatedDoc = await apiClient.updateDocument(document.id, payload);
      setDocument(updatedDoc);
      const historyData = await apiClient.getDocumentHistory(document.id);
      setDocumentHistory(
        historyData.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
      setIsEditing(false);
      setActiveTab('details');
      window.history.replaceState(null, '', `/documents/${docId}`);
      toast({
        title: action === 'save_draft' ? 'Draft Saved' : 'Resubmitted',
        description: `"${updatedDoc.title}" updated.`,
      });
    } catch (error: any) {
      toast({ title: 'Error Updating', description: error.message, variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    if (!document || !user) return;
    try {
      const approvedDoc = await apiClient.approveDocument(document.id);
      setDocument(approvedDoc);
      const historyData = await apiClient.getDocumentHistory(document.id);
      setDocumentHistory(
        historyData.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
      setIsReviewing(false);
      setActiveTab('details');
      window.history.replaceState(null, '', `/documents/${docId}`);
      toast({ title: 'Approved', description: `"${approvedDoc.title}" approved.` });
    } catch (error: any) {
      toast({ title: 'Error Approving', description: error.message, variant: 'destructive' });
    }
  };

  const handleReject = async (reason: string) => {
    if (!document || !user) return;
    try {
      const rejectedDoc = await apiClient.rejectDocument(document.id, reason);
      setDocument(rejectedDoc);
      const historyData = await apiClient.getDocumentHistory(document.id);
      setDocumentHistory(
        historyData.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
      setIsReviewing(false);
      setActiveTab('details');
      window.history.replaceState(null, '', `/documents/${docId}`);
      toast({ title: 'Rejected', description: `"${rejectedDoc.title}" rejected.` });
    } catch (error: any) {
      toast({ title: 'Error Rejecting', description: error.message, variant: 'destructive' });
    }
  };

  if (authLoading || loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading...</p>
      </div>
    );
  if (!document)
    return (
      <div className="text-center mt-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-xl">Document not found.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );

  const canEdit =
    (user.role === 'admin' || document.authorId === user.id) &&
    (document.status === 'draft' ||
      document.status === 'rejected' ||
      (document.status === 'approved' && user.role !== 'viewer'));

  const canReview =
    (user.role === 'admin' || document.reviewerId === user.id) &&
    document.status === 'pending_review';

  if (isEditing && canEdit) {
    return (
      <DocumentForm
        document={document}
        currentUser={user}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setIsEditing(false);
          setActiveTab('details');
          window.history.replaceState(null, '', `/documents/${docId}`);
        }}
        formMode="edit"
      />
    );
  }

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('created')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (action.toLowerCase().includes('submit')) return <Send className="h-4 w-4 text-purple-500" />;
    if (action.toLowerCase().includes('approve')) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (action.toLowerCase().includes('reject')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (action.toLowerCase().includes('edit')) return <Edit3 className="h-4 w-4 text-yellow-500" />;
    if (action.toLowerCase().includes('assign')) return <UserIcon className="h-4 w-4 text-orange-500" />;
    return <History className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
      </Button>
      <Card className="overflow-hidden shadow-xl">
        {document.imageUrl && !isEditing && (
          <div className="relative h-64 md:h-96 w-full">
            <Image src={document.imageUrl} alt={document.title} fill style={{ objectFit: 'cover' }} />
          </div>
        )}
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-3xl font-bold">{document.title}</CardTitle>
              <CardDescription className="text-sm mt-1">Authored by: {document.authorName} | Version: {document.version} | Last updated: {format(new Date(document.updatedAt), 'PPP p')}</CardDescription>
            </div>
            <DocumentStatusBadge status={document.status} />
          </div>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 m-2 md:m-4">
            <TabsTrigger value="details">
              <Eye className="mr-2 h-4 w-4" />Details
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />History
            </TabsTrigger>
            {(canReview || isReviewing) && (
              <TabsTrigger value="reviewActions">
                <ShieldCheck className="mr-2 h-4 w-4" />Review
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="details" className="p-2 md:p-6">
            {document.status === 'rejected' && document.rejectionReason && (
              <Alert variant="destructive" className="mb-6">
                <MessageSquare className="h-4 w-4" />
                <AlertTitle>
                  Rejected on {document.reviewedAt ? format(new Date(document.reviewedAt), 'PPP') : 'N/A'} by{' '}
                  {document.reviewerName || 'Reviewer'}
                </AlertTitle>
                <AlertDescription>Reason: {document.rejectionReason}</AlertDescription>
              </Alert>
            )}
            {document.status === 'pending_review' && (
              <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-300 text-yellow-700">
                <Clock className="h-4 w-4" />
                <AlertTitle>Pending Review</AlertTitle>
                <AlertDescription>
                  This document was submitted on{' '}
                  {document.submittedAt ? format(new Date(document.submittedAt), 'PPP') : 'N/A'} and is awaiting review from{' '}
                  {document.reviewerName || 'the assigned reviewer'}.
                </AlertDescription>
              </Alert>
            )}
            {document.status === 'approved' && (
              <Alert variant="default" className="mb-6 bg-green-50 border-green-300 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Approved</AlertTitle>
                <AlertDescription>
                  This document was approved on{' '}
                  {document.reviewedAt ? format(new Date(document.reviewedAt), 'PPP') : 'N/A'} by{' '}
                  {document.reviewerName || 'Reviewer'}.
                </AlertDescription>
              </Alert>
            )}
            <article className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none p-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
            </article>
          </TabsContent>
          <TabsContent value="history" className="p-2 md:p-6">
            <h3 className="text-xl font-semibold mb-4">Document History</h3>
            <ScrollArea className="h-[300px] rounded-md border p-2">
              <ul className="space-y-3">
                {documentHistory.map((entry) => (
                  <li key={entry.id} className="p-3 bg-muted/50 rounded-md shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getActionIcon(entry.action)}
                        <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                        <span>by {entry.userName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), 'PPP p')}
                      </span>
                    </div>
                    {entry.details && (
                      <div className="mt-1.5 pl-6 text-xs text-muted-foreground">
                        {entry.details}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
          {(canReview || isReviewing) && (
            <TabsContent value="reviewActions" className="p-2 md:p-6">
              <h3 className="text-xl font-semibold mb-4">Review Actions</h3>
              {canReview ? (
                <ReviewActions
                  documentId={document.id}
                  documentTitle={document.title}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ) : (
                <p className="text-muted-foreground">
                  You are not the assigned reviewer or the document is not pending review.
                </p>
              )}
            </TabsContent>
          )}
        </Tabs>
        <CardFooter className="border-t pt-6 flex flex-wrap justify-end gap-3">
          {canEdit && !isEditing && (
            <Button onClick={handleEditClick} variant="secondary">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Document
            </Button>
          )}
          {canReview && !isReviewing && (
            <Button onClick={handleReviewClick} variant="default" className="bg-accent hover:bg-accent/90">
              <ShieldCheck className="mr-2 h-4 w-4" /> Review Document
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
