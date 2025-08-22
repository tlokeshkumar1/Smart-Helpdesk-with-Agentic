import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useKBStore } from '../stores/kb';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateArticleId } from '../utils/validation';

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  tags: z.string(),
  status: z.enum(['unpublish', 'publish']),
});

type ArticleForm = z.infer<typeof articleSchema>;

export const KBEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentArticle, 
    isLoading, 
    fetchArticle, 
    createArticle, 
    updateArticle 
  } = useKBStore();

  const isEditing = !!id && id !== 'new' && id !== 'undefined' && id.trim() !== '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArticleForm>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      status: 'unpublish',
    },
  });

  useEffect(() => {
    // Validate the article ID
    const validation = validateArticleId(id);
    
    if (!validation.isValid && validation.id === null) {
      toast.error('Invalid article ID');
      navigate('/kb');
      return;
    }
    
    if (isEditing && validation.id && validation.id !== 'new') {
      const loadArticle = async () => {
        try {
          await fetchArticle(validation.id!);
        } catch (error: unknown) {
          console.error('Error loading article:', error);
          let errorMessage = 'Failed to load article';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            errorMessage = axiosError.response?.data?.message || 'Failed to load article';
          }
          
          toast.error(errorMessage);
          navigate('/kb');
        }
      };
      loadArticle();
    }
  }, [id, isEditing, fetchArticle, navigate]);

  useEffect(() => {
    if (currentArticle && isEditing) {
      reset({
        title: currentArticle.title,
        body: currentArticle.body,
        tags: currentArticle.tags.join(', '),
        status: currentArticle.status,
      });
    }
  }, [currentArticle, isEditing, reset]);

  const onSubmit = async (data: ArticleForm) => {
    try {
      const articleData = {
        ...data,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      if (isEditing && id) {
        await updateArticle(id, articleData);
        toast.success('Article updated successfully!');
      } else {
        await createArticle(articleData);
        toast.success('Article created successfully!');
      }
      navigate('/kb');
    } catch (error: unknown) {
      console.error('Error saving article:', error);
      let errorMessage = 'Failed to save article';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || 'Failed to save article';
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/kb')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to KB
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Article' : 'New Article'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Article Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              {...register('title')}
              label="Title *"
              placeholder="Enter article title"
              error={errors.title?.message}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Body *
              </label>
              <textarea
                {...register('body')}
                placeholder="Write your article content here..."
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.body && (
                <p className="text-sm text-red-600">{errors.body.message}</p>
              )}
            </div>

            <Input
              {...register('tags')}
              label="Tags"
              placeholder="Enter tags separated by commas"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="unpublish">Unpublish</option>
                <option value="publish">Publish</option>
              </select>
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                isLoading={isLoading}
              >
                {isEditing ? 'Update Article' : 'Create Article'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/kb')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};