import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Copy, CheckCircle2, Terminal, Code2, Server, KeyRound, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CredentialUsageGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = 'cli' | 'node' | 'python' | 'curl';

export function CredentialUsageGuideDialog({ open, onOpenChange }: CredentialUsageGuideDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cli');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const snippets: Record<TabType, { label: string; language: string; code: string; note?: string }> = {
    cli: {
      label: 'AWS CLI',
      language: 'bash',
      code: `# 1. Configure AWS CLI with your S3Forge Access Key and Secret Key
aws configure set aws_access_key_id "YOUR_ACCESS_KEY"
aws configure set aws_secret_access_key "YOUR_SECRET_KEY"
aws configure set default.region "us-east-1"

# 2. Interact directly with S3Forge API endpoints
aws --endpoint-url http://localhost:3000/api/v1/storage s3 ls`,
      note: 'AWS CLI sends AWS SigV4 signatures which are now parsed and authenticated directly by S3Forge.',
    },
    node: {
      label: 'Node.js (AWS SDK v3)',
      language: 'typescript',
      code: `import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

// Initialize S3Client with S3Forge credentials
const s3 = new S3Client({
  endpoint: "http://localhost:3000/api/v1/storage",
  region: "us-east-1",
  credentials: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
  },
  forcePathStyle: true, // Enables path-style routing (/buckets)
});

// Example: List all organization buckets
const response = await s3.send(new ListBucketsCommand({}));
console.log("Buckets:", response.Buckets);`,
      note: 'Set forcePathStyle: true so AWS SDK routes requests using path style.',
    },
    python: {
      label: 'Python (boto3)',
      language: 'python',
      code: `import boto3

# Initialize boto3 client with S3Forge credentials
s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:3000/api/v1/storage',
    aws_access_key_id='YOUR_ACCESS_KEY',
    aws_secret_access_key='YOUR_SECRET_KEY',
    region_name='us-east-1'
)

# Example: Fetch buckets
response = s3.list_buckets()
for bucket in response.get('Buckets', []):
    print(f"Bucket: {bucket['Name']}")`,
      note: 'boto3 uses AWS SigV4 headers automatically which S3Forge validates directly.',
    },
    curl: {
      label: 'cURL / REST Headers',
      language: 'bash',
      code: `# Authenticate REST requests using S3Forge Access Key headers:
curl -H "x-s3forge-access-key: YOUR_ACCESS_KEY" \\
     -H "x-s3forge-secret-key: YOUR_SECRET_KEY" \\
     http://localhost:3000/api/v1/storage/buckets

# Or list objects within a bucket:
curl -H "x-s3forge-access-key: YOUR_ACCESS_KEY" \\
     http://localhost:3000/api/v1/storage/buckets/my-bucket/objects`,
      note: 'You can also pass x-s3forge-access-key header directly for simple HTTP requests.',
    },
  };

  const handleCopySnippet = (code: string, tabKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success('Code snippet copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">How to Use Access Credentials</DialogTitle>
              <DialogDescription className="mt-0.5">
                Integrate S3Forge storage with AWS CLI, boto3, SDKs, and REST APIs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Support Banner */}
          <div className="p-3.5 border rounded-lg bg-green-500/10 border-green-500/20 text-green-900 dark:text-green-300 flex items-start gap-3 text-sm">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-green-900 dark:text-green-200">Native AWS SigV4 Support Enabled</p>
              <p className="text-xs leading-relaxed text-green-800 dark:text-green-300/90">
                S3Forge backend now natively parses AWS SigV4 signatures (<code className="bg-green-500/20 px-1.5 py-0.5 rounded font-mono text-[11px]">AWS4-HMAC-SHA256</code>) and query credentials. Standard tools like <strong className="font-semibold">boto3</strong>, <strong className="font-semibold">AWS CLI</strong>, and <strong className="font-semibold">AWS SDKs</strong> authenticate seamlessly!
              </p>
            </div>
          </div>

          {/* Code Snippet Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto">
              {(Object.keys(snippets) as TabType[]).map((tabKey) => {
                const isSelected = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {tabKey === 'cli' && <Terminal className="h-3.5 w-3.5" />}
                    {tabKey === 'node' && <Code2 className="h-3.5 w-3.5" />}
                    {tabKey === 'python' && <Code2 className="h-3.5 w-3.5" />}
                    {tabKey === 'curl' && <Server className="h-3.5 w-3.5" />}
                    {snippets[tabKey].label}
                  </button>
                );
              })}
            </div>

            {/* Code Block Container */}
            <div className="relative group rounded-lg border bg-slate-950 text-slate-50 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span>{snippets[activeTab].label} Integration</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySnippet(snippets[activeTab].code, activeTab)}
                  className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 px-2"
                >
                  {copiedTab === activeTab ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              <pre className="text-slate-200">{snippets[activeTab].code}</pre>
            </div>

            {/* Note alert */}
            {snippets[activeTab].note && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 italic bg-muted/40 p-2.5 rounded-md border">
                {snippets[activeTab].note}
              </p>
            )}
          </div>

          <div className="pt-2 border-t flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close Guide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
