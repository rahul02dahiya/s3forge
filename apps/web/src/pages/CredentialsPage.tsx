import { useState } from 'react';
import { useCredentials, useRevokeCredential, useDeleteCredential } from '../hooks/useCredentials';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Key, Trash2, PowerOff, CheckCircle2, Loader2, Plus, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { CreateCredentialDialog } from '../components/credentials/CreateCredentialDialog';
import { CredentialUsageGuideDialog } from '../components/credentials/CredentialUsageGuideDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';

export function CredentialsPage() {
  const { data: credentialsData, isLoading, isError } = useCredentials(1, 100);
  const revokeMutation = useRevokeCredential();
  const deleteMutation = useDeleteCredential();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const credentials = credentialsData?.data || [];

  const handleRevokeConfirm = async () => {
    if (!revokeId) return;
    try {
      await revokeMutation.mutateAsync(revokeId);
      toast.success('Credential revoked successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke credential');
    } finally {
      setRevokeId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Credential deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete credential');
    } finally {
      setDeleteId(null);
    }
  };

  if (isError) {
    return (
      <div className="p-6 text-center border rounded-lg bg-destructive/10 text-destructive max-w-5xl">
        <p>Failed to load credentials. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Credentials</h1>
          <p className="text-muted-foreground mt-1">
            Manage S3 access keys for your applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsGuideOpen(true)} className="gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Usage Guide
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Generate Keypair
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Credentials</CardTitle>
          <CardDescription>
            Use these credentials to authenticate your S3-compatible clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-muted/50 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              <Key className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>No credentials generated yet.</p>
              <p className="text-sm mt-1">Generate a keypair to start authenticating API requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map((cred) => (
                <div 
                  key={cred.id} 
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 transition-colors ${cred.isActive ? 'bg-card' : 'bg-muted/30 opacity-70'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full mt-1 ${cred.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {cred.accessKey}
                        </p>
                        {cred.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            Revoked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cred.description || 'No description provided'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {new Date(cred.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>
                          {cred.lastUsedAt 
                            ? `Last used ${new Date(cred.lastUsedAt).toLocaleDateString()}` 
                            : 'Never used'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                    {cred.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokeId(cred.id)}
                        disabled={revokeMutation.isPending && revokeId === cred.id}
                        className="gap-2"
                      >
                        {revokeMutation.isPending && revokeId === cred.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-orange-500" />
                        )}
                        Revoke
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(cred.id)}
                      disabled={deleteMutation.isPending && deleteId === cred.id}
                      className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {deleteMutation.isPending && deleteId === cred.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCredentialDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      <CredentialUsageGuideDialog open={isGuideOpen} onOpenChange={setIsGuideOpen} />

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeId !== null} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Credential?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately invalidate the access key. Any applications using this key will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeConfirm} className="bg-orange-600 hover:bg-orange-700">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the credential record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
