import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKBStore } from '../stores/kb';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidObjectId } from '../utils/validation';

export const KnowledgeBase: React.FC = () => {
  const { 
    articles, 
    searchQuery, 
    isLoading, 
    fetchArticles, 
    deleteArticle,
    toggleArticleStatus,
    setSearchQuery 
  } = useKBStore();
  
  const { user } = useAuthStore();
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    const loadArticles = async () => {
      try {
        await fetchArticles(searchQuery);
      } catch (error: unknown) {
        console.error('Error loading articles:', error);
        let errorMessage = 'Failed to load articles';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'response' in error) {
          const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
          
          if (axiosError.response?.status === 401) {
            errorMessage = 'Authentication required. Please login again.';
          } else {
            errorMessage = axiosError.response?.data?.message || 'Failed to load articles';
          }
        }
        
        toast.error(errorMessage);
      }
    };
    loadArticles();
  }, [searchQuery, fetchArticles]);

  const handleSearch = () => {
    setSearchQuery(localSearch);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      await deleteArticle(id);
      toast.success('Article deleted successfully');
    } catch (error: unknown) {
      console.error('Error deleting article:', error);
      let errorMessage = 'Failed to delete article';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || 'Failed to delete article';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'publish' ? 'unpublish' : 'publish';
    
    try {
      await toggleArticleStatus(id);
      // Refresh articles to ensure UI stays updated
      await fetchArticles(searchQuery);
      toast.success(`Article ${action}ed successfully`);
    } catch (error: unknown) {
      console.error('Error toggling article status:', error);
      let errorMessage = `Failed to ${action} article`;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || `Failed to ${action} article`;
      }
      
      toast.error(errorMessage);
    }
  };

  // Only show admin controls if user is admin
  const isAdmin = user?.role === 'admin';

  if (isLoading && !articles.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <LoadingSkeleton className="h-10 w-32" />
        </div>
        <LoadingSkeleton lines={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        {isAdmin && (
          <Link to="/kb/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Button>
          </Link>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Search articles..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <div className="grid gap-4">
        {articles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No articles found</p>
              {isAdmin && (
                <Link to="/kb/new" className="mt-4 inline-block">
                  <Button>Create your first article</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          articles.filter(article => article && article._id && isValidObjectId(article._id)).map((article) => (
            <Card key={`article-${article._id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle>{article.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={article.status === 'publish' ? 'success' : 'warning'}>
                        {article.status === 'publish' ? 'Publish' : 'Unpublish'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Updated {new Date(article.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(article._id, article.status)}
                          title={article.status === 'publish' ? 'Unpublish' : 'Publish'}
                        >
                          {article.status === 'publish' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Link to={`/kb/${article._id}/edit`}>
                          <Button variant="ghost" size="sm" title="Edit article">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(article._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 line-clamp-3 mb-3">
                  {article.body.substring(0, 200)}...
                </p>
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.map((tag, index) => (
                      <Badge key={`article-${article._id}-tag-${tag}-${index}`} variant="default" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};