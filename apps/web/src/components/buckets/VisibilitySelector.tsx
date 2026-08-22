import { Lock, Globe } from 'lucide-react';
import { Label } from '../ui/label';

interface VisibilitySelectorProps {
  value: 'private' | 'public';
  onChange: (value: 'private' | 'public') => void;
  error?: string;
}

export function VisibilitySelector({ value, onChange, error }: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Bucket Visibility</Label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('private')}
          className={`flex flex-col items-start gap-1 p-3 text-left border rounded-lg transition-all ${
            value === 'private'
              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-accent/50'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Private
          </div>
          <span className="text-[0.75rem] text-muted-foreground leading-tight">
            Restricted to authenticated users & presigned URLs.
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange('public')}
          className={`flex flex-col items-start gap-1 p-3 text-left border rounded-lg transition-all ${
            value === 'public'
              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-accent/50'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <Globe className="h-4 w-4 text-emerald-500" />
            Public
          </div>
          <span className="text-[0.75rem] text-muted-foreground leading-tight">
            Accessible publicly via direct S3 storage links.
          </span>
        </button>
      </div>
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
    </div>
  );
}
