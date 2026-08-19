import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateCredential } from '../../hooks/useCredentials';
import { type CredentialWithSecretResponse } from '../../hooks/useCredentials';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';

const createCredentialSchema = z.object({
  description: z
    .string()
    .max(255, 'Description must not exceed 255 characters')
    .optional(),
});

type CreateCredentialFormValues = z.infer<typeof createCredentialSchema>;

interface CreateCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCredentialDialog({ open, onOpenChange }: CreateCredentialDialogProps) {
  const createCredentialMutation = useCreateCredential();
  
  // Local state to display the newly created credential
  // Explicitly cleared when dialog closes to prevent persistence
  const [createdCredential, setCreatedCredential] = useState<CredentialWithSecretResponse | null>(null);
  const [hasCopiedAccess, setHasCopiedAccess] = useState(false);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);

  const form = useForm<CreateCredentialFormValues>({
    resolver: zodResolver(createCredentialSchema),
    defaultValues: {
      description: '',
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Clean up entirely on close
      form.reset();
      setCreatedCredential(null);
      setHasCopiedAccess(false);
      setHasCopiedSecret(false);
      createCredentialMutation.reset();
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: CreateCredentialFormValues) => {
    try {
      const response = await createCredentialMutation.mutateAsync({
        description: data.description || undefined,
      });

      // Show the generated credential
      if (response) {
        setCreatedCredential(response);
        toast.success('Keypair generated successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate credential');
    }
  };

  const copyToClipboard = (text: string, type: 'access' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'access') {
      setHasCopiedAccess(true);
      setTimeout(() => setHasCopiedAccess(false), 2000);
    } else {
      setHasCopiedSecret(true);
      setTimeout(() => setHasCopiedSecret(false), 2000);
    }
    toast.success(`${type === 'access' ? 'Access Key' : 'Secret Key'} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Access Keypair</DialogTitle>
          <DialogDescription>
            {createdCredential 
              ? 'Your new keypair has been generated. Please copy your secret key now.' 
              : 'Create a new S3 access credential for your applications.'}
          </DialogDescription>
        </DialogHeader>

        {!createdCredential ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input 
                id="description" 
                placeholder="e.g., CI/CD Deployment Key" 
                {...form.register("description")} 
              />
              {form.formState.errors.description && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createCredentialMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCredentialMutation.isPending}>
                {createCredentialMutation.isPending ? 'Generating...' : 'Generate Keypair'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold">Save your secret key!</p>
                <p>This is the <strong>only time</strong> the secret key will be shown to you. You cannot retrieve it later. If you lose it, you will need to generate a new keypair.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Access Key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={createdCredential.accessKey} className="font-mono bg-muted/50" />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(createdCredential.accessKey, 'access')}
                    className="shrink-0"
                  >
                    {hasCopiedAccess ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={createdCredential.secretKey} className="font-mono bg-muted/50" />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(createdCredential.secretKey, 'secret')}
                    className="shrink-0"
                  >
                    {hasCopiedSecret ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                I have saved my secret key
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
