import { ReactNode } from "react";
import { Cloud, Shield, Code2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  className?: string;
}

function StackedBoxesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 7v15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 7v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 7v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthLayout({ children, title, description, className }: AuthLayoutProps) {
  return (
    <div className="relative w-full min-h-dvh lg:h-dvh lg:overflow-hidden grid lg:grid-cols-[1.3fr_1fr] bg-background">
      {/* Shared unified technical background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(39,117,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,117,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_110%)] opacity-100 pointer-events-none" />

      {/* Left branding panel */}
      <div className="relative hidden lg:flex flex-col p-6 xl:p-10 text-foreground min-h-0 h-full">

        <div className="relative z-20 flex items-center text-xl font-bold tracking-tight mb-2 shrink-0">
          <StackedBoxesIcon className="mr-3 h-8 w-8 text-primary" />
          S3Forge
        </div>

        {/* Infrastructure visual representation (WebP image) */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 w-full overflow-visible">
          {/* Subtle glow effect behind the transparent image */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(39,117,255,0.12)_0%,transparent_60%)] pointer-events-none" />
          <img
            src="/cubegraphic.webp"
            alt="Storage Infrastructure Graphic"
            className="w-full object-contain relative z-10 drop-shadow-2xl"
            style={{ maxHeight: 'clamp(300px, 50vh, 500px)' }}
          />
        </div>

        <div className="relative z-20 flex flex-col justify-end mt-4 max-w-lg shrink-0">
          <h1 className="font-semibold tracking-tight text-white mb-3 leading-[1.15]" style={{ fontSize: 'clamp(1.75rem, 3.5vh, 2.5rem)' }}>
            Your storage<span className="text-primary">.</span><br />
            Your infrastructure<span className="text-primary">.</span><br />
            Your control<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground mb-5 max-w-[400px] leading-relaxed" style={{ fontSize: 'clamp(0.875rem, 1.5vh, 1rem)' }}>
            Manage S3-compatible object storage with a secure, self-hosted control plane built for teams that value simplicity and control.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-auto shrink-0">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground/80">S3 Compatible</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground/80">Self-Hosted</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground/80">Developer Friendly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right authentication area */}
      <div className="relative w-full h-full min-h-0 z-10">
        <div className="flex flex-col justify-center items-center min-h-full w-full p-4 sm:p-6 lg:p-4">

          {/* Mobile Logo */}
          <div className="flex items-center mb-6 lg:hidden text-lg font-bold text-foreground w-full max-w-[500px]">
            <StackedBoxesIcon className="mr-2 h-7 w-7 text-primary" />
            S3Forge
          </div>

          <Card className={`w-full max-w-[500px] overflow-y-auto bg-card/40 backdrop-blur-md border border-border shadow-xl rounded-2xl relative scrollbar-thin py-2 ${className || "max-h-[calc(100dvh-32px)]"}`}>
            <CardHeader className="text-left space-y-1 pt-5 px-6">
              <CardTitle className="text-[26px] font-semibold tracking-tight text-foreground leading-tight">{title}</CardTitle>
              <CardDescription className="text-[14px] leading-snug text-muted-foreground">{description}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
