import { useState, useEffect, useRef } from 'react';
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
import { UploadCloud, Save, Send, XCircle, Info, ImagePlus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

// Schema for frontend validation, API will also validate
const documentSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }).optional().default(''),
  imageUrl: z.string().url({ message: "Please enter a valid URL for the cover image." }).optional().or(z.literal('')),
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

  const { toast } = useToast();
  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const contentImageUploadRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, register, formState: { errors }, reset, setValue, getValues } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
      imageUrl: document?.image_url || '',
      reviewerId: document?.reviewer_id || '',
    },
  });

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
        const fetchedReviewers = await apiClient.getReviewers();
        setReviewers(fetchedReviewers.filter(r => r.id !== currentUser.id));
      } catch (error: any) {
        toast({ title: "Error fetching reviewers", description: error.message, variant: "destructive" });
      } finally {
        setIsLoadingReviewers(false);
      }
    };
    fetchReviewers();
  }, [currentUser.id, toast]);

  const handleFileUpload = async (file: File, setLoading: React.Dispatch<React.SetStateAction<boolean>>): Promise<string | null> => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await apiClient.uploadImage(formData);
      toast({ title: "Image Uploaded", description: `${file.name} uploaded successfully.` });
      return response.imageUrl;
    } catch (error: any) {
      toast({ title: "Image Upload Failed", description: error.message, variant: "destructive" });
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
    toast({ title: "Image Inserted", description: `${alt} added.` });
  };

  const processContentImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    const url = await handleFileUpload(file, setIsUploadingContentImage);
    if (url) insertImageMarkdown(url, file.name.replace(file.name.split("_",2)[0]+'_',""));
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

  const onFormSubmit = (data: DocumentFormData, action: 'save_draft' | 'submit_for_review' | 'resubmit_for_review') => {
    if ((action === 'submit_for_review' || action === 'resubmit_for_review') && !data.reviewerId) {
      toast({ title: "Reviewer Required", description: "Please select a reviewer.", variant: "destructive" });
      return;
    }
    const submissionData = {
      ...data,
      content: data.content || '',
      imageUrl: data.imageUrl || undefined,
    };
    onSubmit(submissionData, action);
  };

  const saveAction: 'save_draft' = 'save_draft';
  const submitAction = formMode === 'create' ? 'submit_for_review' : 'resubmit_for_review';

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{formMode === 'edit' ? 'Edit Document' : 'Create New Document'}</CardTitle>
        <CardDescription>{formMode === 'edit' ? 'Update your document details.' : 'Fill in the details to create a new document.'}</CardDescription>
      </CardHeader>
      <form className="space-y-6">
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Enter document title" className="mt-1" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Content with image insert */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="content">Content</Label>
              <Button type="button" variant="outline" size="sm" onClick={triggerContentUpload} disabled={isUploadingContentImage}>
                {isUploadingContentImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />} Insert Image
              </Button>
            </div>
            <Controller
              name="content"
              control={control}
              rules={{ required: 'Content is required', validate: v => v.trim().length >= 10 || 'Content must be at least 10 characters.' }}
              render={({ field }) => (
                <Textarea
                  ref={contentTextAreaRef}
                  value={field.value}
                  onChange={field.onChange}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                />
              )}
            />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
            <p className="mt-1 text-xs text-muted-foreground flex items-center">
              <Info className="h-3 w-3 mr-1" /> Use Markdown for formatting. Drag & drop or use button to insert images.
            </p>
            <input type="file" accept="image/*" ref={contentImageUploadRef} className="hidden" onChange={handleContentImageSelected} />
          </div>

          {/* Cover Image */}
          <div>
            <Label htmlFor="coverImageUpload">Cover Image (Optional)</Label>
            <div className="mt-1 flex items-center gap-4">
              <input ref={coverImageInputRef} id="coverImageUpload" type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
              <Button type="button" variant="outline" onClick={() => coverImageInputRef.current?.click()} disabled={isUploadingCover}>
                {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Upload Cover
              </Button>
              {imagePreview && (
                <div className="relative w-32 h-20 rounded border overflow-hidden">
                  <Image src={imagePreview} alt="Preview" fill style={{ objectFit: 'cover' }} />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 opacity-70 hover:opacity-100" onClick={() => { setImagePreview(null); setValue('imageUrl', ''); }}>
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
                <Label htmlFor="reviewerId">Select Reviewer (for submission)</Label>
                <Controller
                  name="reviewerId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingReviewers}>
                      <SelectTrigger id="reviewerId" className="mt-1">
                        <SelectValue placeholder={isLoadingReviewers ? "Loading reviewers..." : "Choose a reviewer"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingReviewers && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                        {!isLoadingReviewers && reviewers.length === 0 && <SelectItem value="no_reviewers" disabled>No reviewers available</SelectItem>}
                        {reviewers.map(rev => (
                          <SelectItem key={rev.id} value={String(rev.id)}>
                            {rev.name} ({rev.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {errors.reviewerId && <p className="text-sm text-destructive mt-1">{errors.reviewerId.message}</p>}
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          {(formMode === 'create' || (document && ['draft', 'rejected'].includes(document.status))) && (
            <Button type="button" variant="secondary" onClick={handleSubmit(data => onFormSubmit(data, saveAction))}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
          )}
           {/* Allow submit if creating, or if editing and current status is draft or rejected */}
          {(formMode === 'create' || (document && (document.status === 'draft' || document.status === 'rejected'))) && (
            <Button type="button" onClick={handleSubmit(data => onFormSubmit(data, submitAction))}>
              <Send className="mr-2 h-4 w-4" /> {formMode === 'create' ? 'Submit for Review' : 'Resubmit for Review'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
