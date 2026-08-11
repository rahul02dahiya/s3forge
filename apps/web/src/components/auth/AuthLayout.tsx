import { ReactNode } from "react";
import { HardDrive } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="w-full min-h-screen grid lg:grid-cols-[0.85fr_1.15fr]">
      {/* Left branding panel */}
      <div className="relative hidden lg:flex flex-col bg-zinc-950 p-10 text-white dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950" />
        
        {/* Subtle grid/glow effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        <div className="relative z-20 flex items-center text-xl font-medium tracking-tight">
          <HardDrive className="mr-3 h-7 w-7 text-primary" />
          S3Forge
        </div>
        
        <div className="relative z-20 flex-1 flex flex-col justify-center items-start">
           {/* Clean space for aesthetic balance */}
        </div>
        
        <div className="relative z-20 mt-auto">
          <div className="space-y-5">
            <h3 className="text-2xl font-semibold tracking-tight text-white/90">
              Object storage built for teams that value speed, reliability, and control.
            </h3>
            <blockquote className="space-y-2 border-l-2 border-primary/50 pl-4">
              <p className="text-base text-zinc-400">
                "This platform has completely transformed how we manage our custom object storage needs. 
                It's secure, blazing fast, and highly reliable."
              </p>
              <footer className="text-sm text-zinc-500 font-medium mt-2">Sofia Davis, CTO</footer>
            </blockquote>
          </div>
        </div>
      </div>
      
      {/* Right authentication area */}
      <div className="relative flex flex-col justify-center items-center p-6 sm:p-10 bg-zinc-50 dark:bg-background">
        
        {/* Mobile Logo */}
        <div className="flex items-center mb-8 lg:hidden text-lg font-medium">
          <HardDrive className="mr-2 h-6 w-6 text-primary" />
          S3Forge
        </div>

        <div className="w-full max-w-[460px]">
          <Card className="w-full border-zinc-200/60 shadow-sm dark:border-zinc-800 rounded-[18px]">
            <CardHeader className="text-center lg:text-left space-y-2 pt-8 pb-6 px-8">
              <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
