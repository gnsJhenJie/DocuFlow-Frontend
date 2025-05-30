import React, { useState, useEffect, useRef } from 'react';
import type { Document, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  UploadCloud, Save, Send, XCircle, Info, ImagePlus, Loader2,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

// -----------------------------
// Validation Schema
// -----------------------------
const documentSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).optional().default(''),
  imageUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  reviewerId: z.string().optional(),
});

export type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  document?: Document;
  currentUser: User;
  onSubmit: (
    data: DocumentFormData,
    action: 'save_draft' | 'submit_for_review' | 'resubmit_for_review',
  ) => void;
  onCancel?: () => void;
  formMode: 'create' | 'edit';
}

export function DocumentForm({
  document,
  currentUser,
  onSubmit,
  onCancel,
  formMode,
}: DocumentFormProps) {
  // ---------------------------------------------------------------------
  // State & Refs
  // ---------------------------------------------------------------------
  const [imagePreview, setImagePreview] = useState<string | null>(document?.image_url || null);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);
  const [coverTouched, setCoverTouched] = useState(false);

  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const contentImageUploadRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // ---------------------------------------------------------------------
  // Form Handling
  // ---------------------------------------------------------------------
  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    watch,
    formState: { errors , dirtyFields },
    reset,
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
      imageUrl: document?.image_url || '',
      reviewerId: document?.reviewerId != null ? String(document.reviewerId) : '',
    },
  });

  const watchContent = watch('content');

  // ---------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (document) {
      reset({
        title: document.title,
        content: document.content,
        imageUrl: document.image_url || '',
        reviewerId: document.reviewerId != null ? String(document.reviewerId) : '',
      });
      setImagePreview(document.image_url || null);
    }
  }, [document, reset]);

  useEffect(() => {
    const fetchReviewers = async () => {
      setIsLoadingReviewers(true);
      try {
        const data = await apiClient.getReviewers();
        setReviewers(data.filter((r) => Number(r.id) !== Number(currentUser.id)));
      } catch (err: any) {
        toast({ title: 'Error fetching reviewers', description: err.message, variant: 'destructive' });
      } finally {
        setIsLoadingReviewers(false);
      }
    };
    fetchReviewers();
  }, [currentUser.id, toast]);

  // ---------------------------------------------------------------------
  // Scroll Sync (Markdown ↔ Preview)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const editor = contentTextAreaRef.current;
    const preview = previewContainerRef.current;
    if (!editor || !preview) return;

    let isSyncing = false;

    const sync = (source: 'editor' | 'preview') => {
      if (isSyncing) return;
      isSyncing = true;
      const from = source === 'editor' ? editor : preview;
      const to = source === 'editor' ? preview : editor;
      const ratio = from.scrollTop / (from.scrollHeight - from.clientHeight);
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
      isSyncing = false;
    };

    const onEditorScroll = () => sync('editor');
    const onPreviewScroll = () => sync('preview');

    editor.addEventListener('scroll', onEditorScroll);
    preview.addEventListener('scroll', onPreviewScroll);

    return () => {
      editor.removeEventListener('scroll', onEditorScroll);
      preview.removeEventListener('scroll', onPreviewScroll);
    };
  }, []);

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  const handleFileUpload = async (
    file: File,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  ): Promise<string | null> => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiClient.uploadImage(formData);
      toast({ title: 'Image Uploaded', description: `${file.name} uploaded successfully.` });
      return res.imageUrl;
    } catch (err: any) {
      toast({ title: 'Image Upload Failed', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverTouched(true);
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleFileUpload(file, setIsUploadingCover);
    if (url) {
      setImagePreview(url);
      setValue('imageUrl', url, { shouldValidate: true });
    }
    e.target.value = '';
  };

  const insertImageMarkdown = (url: string, alt: string) => {
    const textarea = contentTextAreaRef.current;
    if (!textarea) return;

    const markdown = `![${alt || 'image'}](${url})\n`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = getValues('content') || '';
    setValue('content', content.slice(0, start) + markdown + content.slice(end), { shouldValidate: true });

    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + markdown.length;
      textarea.setSelectionRange(pos, pos);
    });
    toast({ title: 'Image Inserted', description: alt });
  };

  const processContentImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    const url = await handleFileUpload(file, setIsUploadingContentImage);
    if (url) insertImageMarkdown(url, file.name);
  };

  const handleContentImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processContentImage(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processContentImage(file);
  };

  const triggerContentUpload = () => contentImageUploadRef.current?.click();

  // ---------------------------------------------------------------------
  // Submit Actions
  // ---------------------------------------------------------------------
  const onFormSubmit = (
    data: DocumentFormData,
    action: 'save_draft' | 'submit_for_review' | 'resubmit_for_review',
  ) => {
    if (action !== 'save_draft' && !data.reviewerId) {
      toast({ title: 'Reviewer Required', description: 'Please select a reviewer.', variant: 'destructive' });
      return;
    }
    onSubmit(
      { ...data, content: data.content || '', imageUrl: data.imageUrl || undefined },
      action,
    );
  };

  const isApproved = document?.status === 'approved';
  const changedSpecific =
    !!dirtyFields.title ||
    !!dirtyFields.content ||
    !!dirtyFields.imageUrl ||
    !!coverTouched;
  const shouldDisable = isApproved && !changedSpecific;

  const saveAction: 'save_draft' = 'save_draft';
  const submitAction: 'submit_for_review' | 'resubmit_for_review' =
    formMode === 'create' ? 'submit_for_review' : 'resubmit_for_review';

  // ---------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------
  return (
    <Card className="mx-auto w-full max-w-7xl shadow-lg">
      <CardHeader>
        <CardTitle>{formMode === 'edit' ? 'Edit Document' : 'Create New Document'}</CardTitle>
        <CardDescription>
          {formMode === 'edit'
            ? 'Update your document details.'
            : 'Fill in the details to create a new document.'}
        </CardDescription>
      </CardHeader>

      <form className="space-y-10" onSubmit={handleSubmit((d) => onFormSubmit(d, submitAction))}>
        <CardContent className="space-y-10">
          {/* Title ------------------------------------------------------- */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Enter document title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Content ----------------------------------------------------- */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Content</Label>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Markdown Editor */}
              <div className="flex flex-col h-[60vh] min-h-[500px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Markdown</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerContentUpload}
                    disabled={isUploadingContentImage}
                  >
                    {isUploadingContentImage
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <ImagePlus className="mr-2 h-4 w-4" />}
                    Insert Image
                  </Button>
                </div>

                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      ref={contentTextAreaRef}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex-1 resize-none rounded border bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                />
                {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
                <input
                  ref={contentImageUploadRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleContentImageSelected}
                />
                <p className="mt-1 text-xs text-muted-foreground flex items-center">
                  <Info className="mr-1 h-3 w-3" /> Drag & drop images or use the button above.
                </p>
              </div>

              {/* Live Preview */}
              <div className="flex flex-col h-[60vh] min-h-[500px]">
                <span className="text-sm font-medium text-muted-foreground mb-2">Preview</span>
                <div
                  ref={previewContainerRef}
                  className="flex-1 overflow-y-auto rounded border bg-background p-6"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose dark:prose-invert max-w-none">
                    {watchContent || ''}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Image -------------------------------------------------- */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="coverImageUpload">Cover Image (Optional)</Label>
            <div className="flex items-start gap-4">
              <input
                ref={coverImageInputRef}
                id="coverImageUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverImageChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => coverImageInputRef.current?.click()}
                disabled={isUploadingCover}
              >
                {isUploadingCover
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <UploadCloud className="mr-2 h-4 w-4" />}
                Upload Cover
              </Button>

              {imagePreview && (
                <div className="relative h-24 w-40 overflow-hidden rounded border">
                  <Image src={imagePreview} alt="Cover preview" fill sizes="160px" style={{ objectFit: 'cover' }} />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 opacity-75 hover:opacity-100"
                    onClick={() => { setImagePreview(null); setValue('imageUrl', ''); }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
          </div>

          {/* Reviewer Selection ------------------------------------------- */}
          {(formMode === 'create' || (document && ['draft', 'rejected', 'approved'].includes(document.status))) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="reviewerId">Select Reviewer</Label>
              <Controller
                name="reviewerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingReviewers || shouldDisable}>
                    <SelectTrigger id="reviewerId">
                      <SelectValue placeholder={isLoadingReviewers ? 'Loading…' : 'Choose a reviewer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingReviewers && <SelectItem value="loading" disabled>Loading…</SelectItem>}
                      {!isLoadingReviewers && reviewers.length === 0 && (
                        <SelectItem value="none" disabled>No reviewers available</SelectItem>
                      )}
                      {reviewers.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name} ({r.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reviewerId && <p className="text-sm text-destructive">{errors.reviewerId.message}</p>}
            </div>
          )}
        </CardContent>

        {/* Footer Buttons ----------------------------------------------- */}
        <CardFooter className="flex flex-wrap justify-end gap-4 border-t bg-background/50 py-6 backdrop-blur">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}

          {(formMode === 'create' || (document && ['draft', 'rejected', 'approved'].includes(document.status))) && (
            <Button type="button" variant="secondary" className="hover:bg-secondary/70" onClick={handleSubmit((d) => onFormSubmit(d, saveAction))} disabled={shouldDisable}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
          )}

          {(formMode === 'create' || (document && ['draft', 'rejected', 'approved'].includes(document.status))) && (
            <Button type="submit" className="bg-primary/100 hover:bg-primary/80" disabled={shouldDisable}>
              <Send className="mr-2 h-4 w-4" />
              {formMode === 'create' ? 'Submit for Review' : 'Resubmit'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
