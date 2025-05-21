'use client';

import { useState, useEffect } from 'react';
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
import { UploadCloud, Save, Send, XCircle } from 'lucide-react';
import { mockUsers } from '@/lib/mockData'; // For reviewer selection
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const documentSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
  imageUrl: z.string().optional(),
  reviewerId: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  document?: Document; // For editing
  currentUser: User;
  onSubmit: (data: DocumentFormData, action: 'save' | 'submit') => void; // Action type
  onCancel?: () => void;
}

export function DocumentForm({ document, currentUser, onSubmit, onCancel }: DocumentFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(document?.imageUrl || null);
  const { toast } = useToast();

  const { control, handleSubmit, register, formState: { errors }, reset, watch, setValue } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
      imageUrl: document?.imageUrl || '',
      reviewerId: document?.reviewerId || '',
    },
  });

  useEffect(() => {
    if (document) {
      reset({
        title: document.title,
        content: document.content,
        imageUrl: document.imageUrl,
        reviewerId: document.reviewerId,
      });
      setImagePreview(document.imageUrl || null);
    }
  }, [document, reset]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setValue('imageUrl', reader.result as string); // Store as base64 for mock, real app would upload
        console.log('[DocumentForm] Image selected for upload (mock):', file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const reviewers = mockUsers.filter(u => u.role === 'reviewer' || u.role === 'admin');

  const processSubmit = (action: 'save' | 'submit') => (data: DocumentFormData) => {
    if (action === 'submit' && !data.reviewerId) {
        toast({
            title: "Reviewer Required",
            description: "Please select a reviewer before submitting.",
            variant: "destructive",
        });
        return;
    }
    console.log(`[DocumentForm] Form submitted with action: ${action}`, data);
    onSubmit(data, action);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{document ? 'Edit Document' : 'Create New Document'}</CardTitle>
        <CardDescription>
          {document ? 'Update the details of your document.' : 'Fill in the details to create a new document.'}
        </CardDescription>
      </CardHeader>
      <form>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Enter document title" className="mt-1" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="Write your document content here..."
              className="mt-1 min-h-[200px]"
            />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
          </div>

          <div>
            <Label htmlFor="imageUpload">Cover Image (Optional)</Label>
            <div className="mt-1 flex items-center gap-4">
              <Input id="imageUpload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <Button type="button" variant="outline" onClick={() => document.getElementById('imageUpload')?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload Image
              </Button>
              {imagePreview && (
                <div className="relative w-32 h-20 rounded border overflow-hidden">
                  <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" data-ai-hint="image preview" />
                   <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-70 hover:opacity-100"
                    onClick={() => { setImagePreview(null); setValue('imageUrl', undefined); }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
          </div>
          
          {(document?.status === 'draft' || !document) && (
            <div>
                <Label htmlFor="reviewerId">Select Reviewer (for submission)</Label>
                <Controller
                name="reviewerId"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="reviewerId" className="mt-1">
                        <SelectValue placeholder="Choose a reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                        {reviewers.map(rev => (
                        <SelectItem key={rev.id} value={rev.id} disabled={rev.id === currentUser.id}>
                            {rev.name} ({rev.email}) {rev.id === currentUser.id && "(Cannot select self)"}
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
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {(document?.status === 'draft' || !document || document?.status === 'rejected') && (
            <>
            <Button type="button" variant="secondary" onClick={handleSubmit(processSubmit('save'))}>
                <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button type="button" onClick={handleSubmit(processSubmit('submit'))}>
                <Send className="mr-2 h-4 w-4" /> Submit for Review
            </Button>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
