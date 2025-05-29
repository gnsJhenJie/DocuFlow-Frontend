
'use client';

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
  imageUrl: z.string().url({ message: "Please enter a valid URL for the cover image." }).optional().or(z.literal('')), // Allow empty string or valid URL
  reviewerId: z.string().optional(), // Will be string from select, converted to number for API if needed
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  document?: Document; // For editing
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


  const { control, handleSubmit, register, formState: { errors }, reset, watch, setValue, getValues } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
      imageUrl: document?.image_url || '',
      reviewerId: document?.reviewer_id || '', // Keep as string, convert for API
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
        setReviewers(fetchedReviewers.filter(r => r.id !== currentUser.id)); // Exclude current user
      } catch (error: any) {
        toast({ title: "Error fetching reviewers", description: error.message, variant: "destructive" });
      } finally {
        setIsLoadingReviewers(false);
      }
    };
    fetchReviewers();
  }, [currentUser.id, toast]);

  const handleFileUpload = async (file: File, UploaderComponentStateSetter: React.Dispatch<React.SetStateAction<boolean>> ) : Promise<string | null> => {
    UploaderComponentStateSetter(true);
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
        UploaderComponentStateSetter(false);
    }
  };

  const handleCoverImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploadedImageUrl = await handleFileUpload(file, setIsUploadingCover);
      if (uploadedImageUrl) {
        setImagePreview(uploadedImageUrl);
        setValue('imageUrl', uploadedImageUrl, { shouldValidate: true });
      }
    }
  };

  const insertImageMarkdown = (dataUri: string, altText: string) => {
    const textarea = contentTextAreaRef.current;
    if (!textarea) return;

    const markdownToInsert = `![${altText || 'image'}](${dataUri})\n`;
    const currentContent = getValues('content') || '';
    const { selectionStart, selectionEnd } = textarea;

    const newContent = 
      currentContent.substring(0, selectionStart) + 
      markdownToInsert + 
      currentContent.substring(selectionEnd);
    
    setValue('content', newContent, { shouldValidate: true });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + markdownToInsert.length;
    }, 0);

    toast({ title: "Image Inserted", description: `${altText} added to content.` });
  };

  const processContentImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
        return;
    }
    const uploadedImageUrl = await handleFileUpload(file, setIsUploadingContentImage);
    if (uploadedImageUrl) {
      insertImageMarkdown(uploadedImageUrl, file.name || "Uploaded Image");
    }
  };

  const handleContentImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processContentImageFile(file);
    }
    if (event.target) event.target.value = ""; 
  };

  const handleContentDrop = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      processContentImageFile(files[0]);
    }
  };
  const handleContentDragOver = (event: React.DragEvent<HTMLTextAreaElement>) => event.preventDefault();
  const triggerContentImageUpload = () => contentImageUploadRef.current?.click();


  const onFormSubmit = (data: DocumentFormData, action: 'save_draft' | 'submit_for_review' | 'resubmit_for_review') => {
    if ((action === 'submit_for_review' || action === 'resubmit_for_review') && !data.reviewerId) {
        toast({
            title: "Reviewer Required",
            description: "Please select a reviewer before submitting.",
            variant: "destructive",
        });
        return;
    }
    const submissionData = {
        ...data,
        content: data.content || '', 
        imageUrl: data.imageUrl || undefined, // Ensure empty string becomes undefined for API
    };
    onSubmit(submissionData, action);
  };

  const saveAction: 'save_draft' = 'save_draft';
  const submitAction: 'submit_for_review' | 'resubmit_for_review' = formMode === 'create' ? 'submit_for_review' : 'resubmit_for_review';


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{formMode === 'edit' ? 'Edit Document' : 'Create New Document'}</CardTitle>
        <CardDescription>
          {formMode === 'edit' ? 'Update the details of your document.' : 'Fill in the details to create a new document.'}
        </CardDescription>
      </CardHeader>
      <form> {/* Removed onSubmit from form tag, will use button onClick + handleSubmit */}
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Enter document title" className="mt-1" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="content">Content</Label>
              <Button type="button" variant="outline" size="sm" onClick={triggerContentImageUpload} disabled={isUploadingContentImage}>
                {isUploadingContentImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                Insert Image
              </Button>
            </div>
            <Controller
              name="content"
              control={control}
              rules={{
                required: 'Content is required',
                validate: value =>
                  value.trim().length >= 10 || 'Content must be at least 10 characters.'
              }}
              render={({ field }) => (
                <Textarea
                  // label="Content"
                  value={field.value}
                  onChange={field.onChange}
                  // error={!!errors.content}
                  // helperText={errors.content?.message}
                />
              )}
            />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
            <p className="mt-1 text-xs text-muted-foreground flex items-center">
              <Info className="h-3 w-3 mr-1" />
              Use Markdown for formatting. Drag & drop or use button to upload and insert images.
            </p>
             <input
              type="file" accept="image/*" ref={contentImageUploadRef}
              style={{ display: 'none' }} onChange={handleContentImageSelected}
            />
          </div>

          <div>
            <Label htmlFor="coverImageUpload">Cover Image (Optional)</Label>
            <div className="mt-1 flex items-center gap-4">
              <input id="coverImageUpload" type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
              <Button type="button" variant="outline" onClick={() => document.getElementById('coverImageUpload')?.click()} disabled={isUploadingCover}>
                {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Upload Cover
              </Button>
              {imagePreview && (
                <div className="relative w-32 h-20 rounded border overflow-hidden">
                  <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" data-ai-hint="image preview" />
                   <Button
                    type="button" variant="destructive" size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-70 hover:opacity-100"
                    onClick={() => { setImagePreview(null); setValue('imageUrl', ''); }} // Set to empty string
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
          </div>
          
          {/* Show reviewer selection if creating, or if editing and status allows submission/resubmission */}
          {(formMode === 'create' || (document && (document.status === 'draft' || document.status === 'rejected'))) && (
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
                          <SelectItem key={rev.id} value={rev.id}>
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
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          {/* Allow save draft if creating, or if editing and current status is draft or rejected */}
          {(formMode === 'create' || (document && (document.status === 'draft' || document.status === 'rejected'))) && (
            <Button type="button" variant="secondary" onClick={handleSubmit(data => onFormSubmit(data, saveAction))}>
                <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
          )}
           {/* Allow submit if creating, or if editing and current status is draft or rejected */}
          {(formMode === 'create' || (document && (document.status === 'draft' || document.status === 'rejected'))) && (
            <Button type="button" onClick={handleSubmit(data => onFormSubmit(data, submitAction))}>
                <Send className="mr-2 h-4 w-4" /> 
                {formMode === 'create' ? 'Submit for Review' : 'Resubmit for Review'}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
