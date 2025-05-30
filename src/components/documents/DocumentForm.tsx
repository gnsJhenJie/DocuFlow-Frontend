import React, { useState, useEffect, useRef } from 'react';
import type { Document, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UploadCloud, Save, Send, XCircle, Info, ImagePlus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

// Schema for frontend validation, API also validates
const documentSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }).optional().default(''),
  imageUrl: z.string().url({ message: 'Please enter a valid URL for the cover image.' }).optional().or(z.literal('')),
  reviewerId: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  document?: Document;
  currentUser: User;
  onSubmit: (data: DocumentFormData, action: 'save_draft' | 'submit_for_review' | 'resubmit_for_review') => void;
  onCancel?: () => void;
  formMode: 'create' | 'edit';
}

export function DocumentForm({ document, currentUser, onSubmit, onCancel, formMode }: DocumentFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(document?.image_url || null);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);

  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const contentImageUploadRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    watch,
    formState: { errors },
    reset,
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
      imageUrl: document?.image_url || '',
      reviewerId: document?.reviewer_id || '',
    },
  });

  const watchContent = watch('content');

  useEffect(() => {
    if (document) {
      reset({
        title: document.title,
        content: document.content,
        imageUrl: document.image_url || '',
        reviewerId: document.reviewer_id || '',
      });
      setImagePreview(document.image_url || null);
    }
  }, [document, reset]);

  useEffect(() => {
    const fetchReviewers = async () => {
      setIsLoadingReviewers(true);
      try {
        const data = await apiClient.getReviewers();
        setReviewers(data.filter(r => r.id !== currentUser.id));
      } catch (err: any) {
        toast({ title: 'Error fetching reviewers', description: err.message, variant: 'destructive' });
      } finally {
        setIsLoadingReviewers(false);
      }
    };
    fetchReviewers();
  }, [currentUser.id, toast]);

  const handleFileUpload = async (
    file: File,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
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
    const newContent = content.slice(0, start) + markdown + content.slice(end);
    setValue('content', newContent, { shouldValidate: true });
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
    }, 0);
    toast({ title: 'Image Inserted', description: `${alt} added.` });
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
  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => e.preventDefault();
  const triggerContentUpload = () => contentImageUploadRef.current?.click();

  const onFormSubmit = (
    data: DocumentFormData,
    action: 'save_draft' | 'submit_for_review' | 'resubmit_for_review'
  ) => {
    if ((action !== 'save_draft') && !data.reviewerId) {
      toast({ title: 'Reviewer Required', description: 'Please select a reviewer.', variant: 'destructive' });
      return;
    }
    onSubmit({
      ...data,
      content: data.content || '',
      imageUrl: data.imageUrl || undefined,
    }, action);
  };
  const saveAction: 'save_draft' = 'save_draft';
  const submitAction = formMode === 'create' ? 'submit_for_review' : 'resubmit_for_review';

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{formMode === 'edit' ? 'Edit Document' : 'Create New Document'}</CardTitle>
        <CardDescription>{formMode === 'edit' ? 'Update your document details.' : 'Fill in the details to create a new document.'}</CardDescription>
      </CardHeader>
      <form className="space-y-8">
        <CardContent className="space-y-8">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>            <Input id="title" {...register('title')} placeholder="Enter document title" className="mt-1" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Content Editor & Preview */}
          <div>
            <Label htmlFor="content">Content</Label>
            <div className="mt-2 flex space-x-6">
              {/* Markdown Editor */}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Markdown</span>
                  <Button type="button" variant="outline" size="sm" onClick={triggerContentUpload} disabled={isUploadingContentImage}>
                    {isUploadingContentImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />} Insert
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
                      onDragOver={handleDragOver}
                      className="flex-1 min-h-[500px]"
                    />
                  )}
                />
                {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
                <input
                  type="file"
                  accept="image/*"
                  ref={contentImageUploadRef}
                  className="hidden"
                  onChange={handleContentImageSelected}
                />
                <p className="mt-1 text-xs text-muted-foreground flex items-center">
                  <Info className="h-3 w-3 mr-1" /> Use Markdown. Drag & drop or button to insert images.
                </p>
              </div>
              {/* Live Preview */}
              <div className="flex-1 flex flex-col">
                <span className="text-sm font-medium mb-2">Preview</span>
                <div className="prose max-w-full overflow-auto flex-1 p-4 border rounded bg-gray-50 dark:bg-gray-900">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{watchContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <Label htmlFor="coverImageUpload">Cover Image (Optional)</Label>
            <div className="mt-1 flex items-center gap-4">
              <input
                ref={coverImageInputRef}
                id="coverImageUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverImageChange}
              />
              <Button type="button" variant="outline" onClick={() => coverImageInputRef.current?.click()} disabled={isUploadingCover}>
                {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Upload Cover
              </Button>
              {imagePreview && (
                <div className="relative w-40 h-24 rounded border overflow-hidden">
                  <Image src={imagePreview} alt="Preview" fill style={{ objectFit: 'cover' }} />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 opacity-70 hover:opacity-100"
                    onClick={() => { setImagePreview(null); setValue('imageUrl', ''); }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
          </div>

          {/* Reviewer Selection */}
          {(formMode === 'create' || (document && ['draft', 'rejected'].includes(document.status))) && (
            <div>
              <Label htmlFor="reviewerId">Select Reviewer</Label>
              <Controller
                name="reviewerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingReviewers}>
                    <SelectTrigger id="reviewerId" className="mt-1 w-full">
                      <SelectValue placeholder={isLoadingReviewers ? 'Loading...' : 'Choose a reviewer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingReviewers && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                      {!isLoadingReviewers && reviewers.length === 0 && <SelectItem value="no_reviewers" disabled>No reviewers</SelectItem>}
                      {reviewers.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name} ({r.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reviewerId && <p className="text-sm text-destructive mt-1">{errors.reviewerId.message}</p>}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-4 border-t pt-6">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          {(formMode === 'create' || (document && ['draft', 'rejected'].includes(document.status))) && (
            <Button type="button" variant="secondary" onClick={handleSubmit(data => onFormSubmit(data, saveAction))}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
          )}
          {(formMode === 'create' || (document && ['draft', 'rejected'].includes(document.status))) && (
            <Button type="button" onClick={handleSubmit(data => onFormSubmit(data, submitAction))}>
              <Send className="mr-2 h-4 w-4" /> {formMode === 'create' ? 'Submit for Review' : 'Resubmit'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
