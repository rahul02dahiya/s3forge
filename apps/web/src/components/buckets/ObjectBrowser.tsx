import { useState, useRef } from 'react';
import { useObjects, useGeneratePresignedUpload, useGeneratePresignedDownload, useDeleteObject } from '../../hooks/useObjects';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FileUp, File, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ObjectBrowser({ bucketName }: { bucketName: string }) {
  const [prefix, setPrefix] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deleteObjectKey, setDeleteObjectKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: objectsResponse, isLoading, isError, refetch } = useObjects(bucketName, prefix);
  const generateUploadMutation = useGeneratePresignedUpload(bucketName);
  const generateDownloadMutation = useGeneratePresignedDownload(bucketName);
  const deleteMutation = useDeleteObject(bucketName);
  const queryClient = useQueryClient();

  const objects = objectsResponse?.data || [];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // 1. Get presigned URL from backend
      const presignedData = await generateUploadMutation.mutateAsync({
        objectName: prefix ? `${prefix}${file.name}` : file.name,
        contentType: file.type || 'application/octet-stream',
        expirySeconds: 3600,
      });

      const uploadUrl = presignedData?.data?.url;
      
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from backend');
      }

      // 2. Upload file directly to S3/MinIO via PUT
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      toast.success('File uploaded successfully');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['buckets', bucketName, 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    } catch (error: any) {
      toast.error(error.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (objectName: string) => {
    try {
      const presignedData = await generateDownloadMutation.mutateAsync({
        objectName,
        expirySeconds: 3600,
      });

      const downloadUrl = presignedData?.data?.url;
      if (!downloadUrl) throw new Error('Failed to get download URL');

      // Open URL directly to trigger download
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Error downloading file');
    }
  };

  const handleDelete = async () => {
    if (!deleteObjectKey) return;

    try {
      await deleteMutation.mutateAsync({ objectName: deleteObjectKey });
      toast.success('Object deleted successfully');
      // Refetch is handled by query invalidation in the hook
    } catch (error: any) {
      toast.error(error.message || 'Error deleting object');
    } finally {
      setDeleteObjectKey(null);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Object Browser</CardTitle>
          <CardDescription>Manage files and objects in this bucket</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Search by prefix..." 
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="w-full sm:w-64"
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <Button onClick={handleUploadClick} disabled={isUploading} className="gap-2 shrink-0">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-destructive border border-destructive/20 rounded-lg bg-destructive/10">
            <p>Failed to load objects. Please try again later.</p>
          </div>
        ) : objects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
            <File className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p>No objects found in this bucket.</p>
            <p className="text-sm mt-1">Upload a file to get started.</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 hidden md:table-cell">Last Modified</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {objects.map((obj: any) => (
                  <tr key={obj.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <File className="h-4 w-4 text-primary/70" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{obj.name}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(obj.size)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {new Date(obj.lastModified).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDownload(obj.name)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteObjectKey(obj.name)}
                          disabled={deleteMutation.isPending && deleteObjectKey === obj.name}
                          title="Delete"
                        >
                          {deleteMutation.isPending && deleteObjectKey === obj.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteObjectKey !== null} onOpenChange={(open) => !open && setDeleteObjectKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Object?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteObjectKey}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
