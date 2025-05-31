'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { DocumentForm } from '@/components/documents/DocumentForm';
import { ReviewActions } from '@/components/documents/ReviewActions';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';

import type { Document, DocumentHistoryEntry, User } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { ArrowLeft, Edit3, Eye, Clock, CheckCircle2, XCircle, MessageSquare, ShieldCheck, Send, FileText, History, AlertTriangle, Loader2, Trash2, UserCheck2, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ---------- helpers ---------- */
const getActionIcon = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes('created')) return <FileText className="h-4 w-4 text-blue-500" />;
  if (a.includes('submit')) return <Send className="h-4 w-4 text-purple-500" />;
  if (a.includes('approve')) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (a.includes('reject')) return <XCircle className="h-4 w-4 text-red-500" />;
  if (a.includes('edit')) return <Edit3 className="h-4 w-4 text-yellow-500" />;
  if (a.includes('assign')) return <UserIcon className="h-4 w-4 text-orange-500" />;
  return <History className="h-4 w-4 text-gray-500" />;
};

/* ---------- component ---------- */
export default function DocumentDetailPage() {
  /* -- hooks & basic state -- */
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const docId = searchParams.get('id') ?? '';
  const [doc, setDoc] = useState<Document | null>(null);
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'reviewActions'>('details');

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [potentialReviewers, setPotentialReviewers] = useState<User[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /* -- utils -- */
  const buildUrl = (flags: { edit?: boolean; review?: boolean; tab?: string } = {}) => {
    const q = new URLSearchParams();
    q.set('id', docId);
    if (flags.edit)   q.set('edit', 'true');
    if (flags.review) q.set('review', 'true');
    if (flags.tab)    q.set('tab', flags.tab);
    return `/documents/view?${q.toString()}`;
  };

  useEffect(() => {
    const q = Object.fromEntries(new URLSearchParams(window.location.search));
    setIsEditing(q.edit === 'true');
    setIsReviewing(q.review === 'true');
    if (q.tab) setActiveTab(q.tab as any);
  }, []);

  const fetchData = useCallback(async () => {
    if (!docId || authLoading) return;
    setLoading(true);
    try {
      const [d, h] = await Promise.all([
        apiClient.getDocumentById(docId),
        apiClient.getDocumentHistory(docId),
      ]);
      setDoc(d);
      setHistory(h.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [docId, authLoading, toast]);
  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- flag handlers ---------- */
  const enterEditMode   = () => { setIsEditing(true);  setIsReviewing(false); router.replace(buildUrl({ edit: true })); };
  const enterReviewMode = () => { setIsReviewing(true); setActiveTab('reviewActions'); router.replace(buildUrl({ review: true, tab: 'reviewActions' })); };
  const changeTab = (t: typeof activeTab) => {
    setActiveTab(t);
    if (t === 'reviewActions') setIsReviewing(true);
    router.replace(buildUrl({
      edit: isEditing,
      review: t === 'reviewActions' || isReviewing,
      tab: t !== 'details' ? t : undefined,
    }));
  };

  const handleDelete = async () => {
    // if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    try {
      await apiClient.deleteDocument(doc.id);
      router.push('/documents');
      toast({
        title: 'Document Deleted',
        description: `"${doc.title}" has been successfully deleted.`,
        variant: 'success',
      });
      // window.location.reload();
    } catch (err: any) {
      alert(`Error Deleting Document: ${err.message}`);
    }
  };

  /* ---------- CRUD helpers (submit / approve / reject) ---------- */
  const refreshDocAndHistory = async (newDoc?: Document) => {
    if (newDoc) setDoc(newDoc);
    setHistory(
      (await apiClient.getDocumentHistory(doc!.id)).sort(
        (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)
      )
    );
  };

  const handleFormSubmit = async (
    data: any,
    action: 'save_draft' | 'resubmit_for_review'
  ) => {
    if (!doc || !user) return;
    const payload: any = { title: data.title, content: data.content, action };
    if (data.imageUrl)   payload.imageUrl   = data.imageUrl;
    if (data.reviewerId) payload.reviewerId = Number(data.reviewerId);

    if (action === 'resubmit_for_review' && !payload.reviewerId) {
      toast({ title: 'Reviewer Required', description: 'Select a reviewer.', variant: 'destructive' });
      return;
    }

    try {
      const updated = await apiClient.updateDocument(doc.id, payload);
      await refreshDocAndHistory(updated);
      setIsEditing(false);
      setActiveTab('details');
      router.replace(buildUrl());
      toast({
        title: action === 'save_draft' ? 'Draft Saved' : 'Submitted',
        description: `"${updated.title}" updated.`,
      });
    } catch (err: any) {
      toast({ title: 'Update Error', description: err.message, variant: 'destructive' });
    }
  };

  const fetchReviewersForModal = async () => {
    if (!showReassignModal) return; // Only fetch if modal is to be shown
    setIsLoadingReviewers(true);
    try {
      const fetchedReviewers = await apiClient.getReviewers();
      // Filter out the document's current author from the list of potential new reviewers
      setPotentialReviewers(fetchedReviewers.filter(rev => rev.id !== doc?.author_id));
    } catch (error: any) {
      toast({ title: "Error fetching reviewers", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingReviewers(false);
    }
  };
  
  // Fetch reviewers when the reassign modal is about to open
  useEffect(() => {
    if (showReassignModal && doc) {
      fetchReviewersForModal();
    }
  }, [showReassignModal, doc]);

  const handleReassign = async (newReviewerId: string) => {
    if (!doc || !newReviewerId) return;
    try {
      const updatedDoc = await apiClient.reassignReviewer(doc.id, Number(newReviewerId));  // 調用後端 API
      await refreshDocAndHistory(updatedDoc);
      toast({
        title: "Document Reassigned",
        description: `"${updatedDoc.title}" has been reassigned.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Could not reassign reviewer: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleApprove = async () => {
    if (!doc || !user) return;
    try {
      const approved = await apiClient.approveDocument(doc.id);
      await refreshDocAndHistory(approved);
      setIsReviewing(false);
      setActiveTab('details');
      router.replace(buildUrl());
      toast({ title: 'Approved', description: `"${approved.title}" approved.` });
    } catch (err: any) {
      toast({ title: 'Approve Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (reason: string) => {
    if (!doc || !user) return;
    try {
      const rejected = await apiClient.rejectDocument(doc.id, reason);
      await refreshDocAndHistory(rejected);
      setIsReviewing(false);
      setActiveTab('details');
      router.replace(buildUrl());
      toast({ title: 'Rejected', description: `"${rejected.title}" rejected.` });
    } catch (err: any) {
      toast({ title: 'Reject Error', description: err.message, variant: 'destructive' });
    }
  };

  /* ---------- guards ---------- */
  if (!docId) {
    return (
      <div className="text-center mt-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-xl">Missing document id.</p>
        <Link href="/documents">
          <Button className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents</Button>
        </Link>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading…</span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center mt-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-xl">Document not found.</p>
        <Link href="/documents">
          <Button className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents</Button>
        </Link>
      </div>
    );
  }

  /* ---------- permissions ---------- */
  const isAuthor = doc.authorId === Number(user.id);
  const isReviewer = doc.reviewerId === Number(user.id);
  const isAdmin = user.role === 'admin';

  const canEdit =
    isAdmin
      ? (doc.status === 'approved' ||
         (isAuthor && ['draft', 'rejected'].includes(doc.status)))
      : (['editor', 'reviewer'].includes(user.role) &&
         isAuthor &&
         ['draft', 'rejected'].includes(doc.status)
        );
  const canReview = isReviewer && doc.status === 'pending_review';
  const canDelete =
    isAdmin
      ? (doc.status === 'approved' ||
         (isAuthor && ['draft', 'rejected'].includes(doc.status)))
      : (['editor', 'reviewer'].includes(user.role) &&
         isAuthor &&
         ['draft', 'rejected'].includes(doc.status));

  /* ---------- render ---------- */
  if (isEditing && canEdit) {
    return (
      <DocumentForm
        document={doc}
        currentUser={user}
        formMode="edit"
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setIsEditing(false);
          setActiveTab('details');
          router.replace(buildUrl());
        }}
      />
    );
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-0">
        <Link href="/documents" className="mb-6 inline-block">
          <Button className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents</Button>
        </Link>

      <Card className="overflow-hidden shadow-xl">
        {doc.imageUrl && (
          <div className="flex justify-center">
            <img
              src={doc.imageUrl}
              alt={doc.title}
              className="h-[60vh] w-auto object-contain"
            />
          </div>
        )}
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-3xl font-bold">{doc.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                Authored by: {doc.authorName} | Last updated:{' '}
                {format(new Date(doc.updatedAt), 'PPP p')}
              </CardDescription>
            </div>
            <DocumentStatusBadge status={doc.status} />
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              if (v === 'reviewActions') setIsReviewing(true);
              router.replace(buildUrl({
                edit: isEditing,
                review: v === 'reviewActions' || isReviewing,
                tab: v !== 'details' ? v : undefined,
              }));
            }}
            className="w-full"
          >
            <TabsList className="grid max-w-full grid-cols-2 md:grid-cols-3 m-2 md:m-4">
              <TabsTrigger value="details"><Eye className="mr-2 h-4 w-4" />Details</TabsTrigger>
              <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
              <TabsTrigger value="reviewActions"><ShieldCheck className="mr-2 h-4 w-4" />Review</TabsTrigger>
            </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="p-2 md:p-6">
                  {doc.status === 'rejected' && doc.rejectionReason && (
                  <Alert variant="destructive" className="mb-6">
                    <MessageSquare className="h-4 w-4" />
                    <AlertTitle>
                      Rejected on {doc.reviewedAt ? format(new Date(doc.reviewedAt), 'PPP') : 'N/A'} by{' '}
                      {doc.reviewerName || 'Reviewer'}
                    </AlertTitle>
                    <AlertDescription>Reason: {doc.rejectionReason}</AlertDescription>
                  </Alert>
                )}
                {doc.status === 'pending_review' && (
                  <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-300 text-yellow-700">
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Pending Review</AlertTitle>
                    <AlertDescription>
                      Submitted on {doc.submittedAt ? format(new Date(doc.submittedAt), 'PPP') : 'N/A'}; awaiting{' '}
                      {doc.reviewerName || 'reviewer'}.
                    </AlertDescription>
                  </Alert>
                )}
                {doc.status === 'approved' && (
                  <Alert variant="default" className="mb-6 bg-green-50 border-green-300 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Approved</AlertTitle>
                    <AlertDescription>
                      Approved on {doc.reviewedAt ? format(new Date(doc.reviewedAt), 'PPP') : 'N/A'} by{' '}
                      {doc.reviewerName || 'Reviewer'}.
                    </AlertDescription>
                  </Alert>
                )}

                <article className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none p-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
                </article>
              </TabsContent>

              {/* History */}
              <TabsContent value="history" className="p-2 md:p-6">
                <h3 className="text-xl font-semibold mb-4">Document History</h3>
                <ScrollArea className="h-[300px] rounded-md border p-2">
                  <ul className="space-y-3">
                    {history.map((e) => (
                      <li key={e.id} className="p-3 bg-muted/50 rounded-md shadow-sm">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getActionIcon(e.action)}
                            <span className="font-medium capitalize">{e.action.replace(/_/g, ' ')}</span>
                            <span>by {e.userName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(e.timestamp), 'PPP p')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </TabsContent>

              {/* Review */}
              {(canReview || isReviewing) && (
                <TabsContent value="reviewActions" className="p-2 md:p-6">
                  <h3 className="text-xl font-semibold mb-3.5">Review Actions</h3>
                  {isAdmin ? (
                    canReview ? (
                      <ReviewActions
                        documentId={doc.id}
                        documentTitle={doc.title}
                        onReassign={handleReassign}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        showReassign={true}
                        showApprove={true}
                        showReject={true}
                        currentUserId={user.id}
                        currentReviewerId={doc.reviewerId}
                      />
                    ) : (
                      <>
                        <p className="mb-4 text-muted-foreground">
                          You are not the assigned reviewer. The reviewer is {doc.reviewerName || 'not yet assigned'}.
                        </p>
                        
                        <ReviewActions
                          documentId={doc.id}
                          documentTitle={doc.title}
                          onReassign={handleReassign}
                          onApprove={() => {}}
                          onReject={() => {}}
                          showReassign={true}
                          showApprove={false}
                          showReject={false}
                          currentUserId={user.id}
                          currentReviewerId={doc.reviewerId}
                        />
                        
                      </>
                    )
                  ) : (
                    canReview ? (
                      <ReviewActions
                        documentId={doc.id}
                        documentTitle={doc.title}
                        onReassign={() => {}}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        showReassign={false}
                        showApprove={true}
                        showReject={true}
                        currentUserId={user.id}
                        currentReviewerId={doc.reviewerId}
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        You are not the assigned reviewer. The reviewer is {doc.reviewerName || 'not yet assigned'}.
                      </p>
                    )
                  )}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>

          <CardFooter className="border-t pt-6 flex flex-wrap justify-end gap-3">
            {canEdit && !isEditing && (
              <Button onClick={enterEditMode} variant="secondary">
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            {canReview && !isReviewing && (
              <Button onClick={enterReviewMode} className="bg-accent hover:bg-accent/90">
                <ShieldCheck className="mr-2 h-4 w-4" /> Review
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="mr-0.2 h-4 w-4"/>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deleting Document: {doc.title}</DialogTitle>
            <DialogDescription>
                Are you sure you want to delete this document?<br/>
                This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleDelete} variant="destructive">
                Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

