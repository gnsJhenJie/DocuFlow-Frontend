'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Document, User, ReviewStatus } from '@/lib/types';
import { mockDocuments, mockUsers } from '@/lib/mockData'; // Assuming mockUsers for reviewer reassignment
import { MoreHorizontal, Edit, Trash2, Send, Eye, Clock, CheckCircle2, XCircle, UserCheck2, History } from 'lucide-react';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

interface AdminDocumentTableProps {
  documents: Document[];
  onReassignReviewer: (documentId: string, newReviewerId: string) => void;
  onViewHistory: (documentId: string) => void; // Placeholder for history view
  // Add other actions as needed, e.g., onDelete, onArchive
}

export function AdminDocumentTable({ documents, onReassignReviewer, onViewHistory }: AdminDocumentTableProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newReviewerId, setNewReviewerId] = useState<string>('');
  const { toast } = useToast();

  const reviewers = mockUsers.filter(u => u.role === 'reviewer' || u.role === 'admin');

  const handleOpenReassignModal = (doc: Document) => {
    setSelectedDocument(doc);
    setNewReviewerId(doc.reviewerId || '');
    setShowReassignModal(true);
  };

  const handleConfirmReassign = () => {
    if (selectedDocument && newReviewerId) {
      onReassignReviewer(selectedDocument.id, newReviewerId);
      console.log(`[AdminDocTable] Reassigning reviewer for doc ${selectedDocument.id} to ${newReviewerId}`);
      toast({
        title: "Reviewer Reassigned",
        description: `Reviewer for "${selectedDocument.title}" changed.`,
      });
      setShowReassignModal(false);
      setSelectedDocument(null);
    } else {
      toast({
        title: "Selection Error",
        description: "Please select a new reviewer.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  <Link href={`/documents/${doc.id}`} className="hover:text-primary hover:underline">
                    {doc.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <DocumentStatusBadge status={doc.status} />
                </TableCell>
                <TableCell>{doc.authorName}</TableCell>
                <TableCell>{doc.reviewerName || 'N/A'}</TableCell>
                <TableCell>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</TableCell>
                <TableCell>{doc.submittedAt ? format(new Date(doc.submittedAt), 'PP') : 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                       <DropdownMenuItem asChild>
                        <Link href={`/documents/${doc.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" /> View Document
                        </Link>
                       </DropdownMenuItem>
                      {(doc.status === 'pending_review' || doc.status === 'draft' || doc.status === 'rejected') && (
                        <DropdownMenuItem onClick={() => handleOpenReassignModal(doc)}>
                          <UserCheck2 className="mr-2 h-4 w-4" /> Reassign Reviewer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => { onViewHistory(doc.id); router.push(`/documents/${doc.id}?tab=history`); }}>
                        <History className="mr-2 h-4 w-4" /> View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                       <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Document
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reassign Reviewer</DialogTitle>
            <DialogDescription>
              Change the assigned reviewer for document: "{selectedDocument?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newReviewer" className="text-right col-span-1">
                New Reviewer
              </Label>
              <div className="col-span-3">
                <Select value={newReviewerId} onValueChange={setNewReviewerId}>
                    <SelectTrigger id="newReviewer">
                    <SelectValue placeholder="Select a reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                    {reviewers.map(rev => (
                        <SelectItem key={rev.id} value={rev.id} disabled={rev.id === selectedDocument?.authorId}>
                        {rev.name} ({rev.email}) {rev.id === selectedDocument?.authorId && "(Author)"}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmReassign}>Confirm Reassignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Dummy Card component if not using shadcn (but we are)
const Card: React.FC<{ className?: string, children: React.ReactNode }> = ({ className, children }) => (
  <div className={`bg-card rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

// Dummy router for Link if next/navigation is not available in this context
// (it will be, this is just for isolated thought process)
const router = { push: (path: string) => console.log(`Navigating to ${path}`) };
