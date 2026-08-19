import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordInput } from "../components/auth/PasswordInput";
import { SocialLoginButton } from "../components/auth/SocialLoginButton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import { signIn } from "../lib/auth";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await signIn({ email: data.email, password: data.password });
      toast.success("Successfully signed in");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue to S3Forge."
    >
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground z-10" />
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  className="pl-10 h-12 bg-input/40 border-border focus-visible:ring-primary shadow-sm"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className="h-12 bg-input/40 border-border focus-visible:ring-primary shadow-sm"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-1.5">
              <Checkbox 
                id="rememberMe" 
                checked={rememberMe}
                onCheckedChange={(checked) => setValue("rememberMe", checked as boolean)}
                disabled={isLoading}
              />
              <label
                htmlFor="rememberMe"
                className="text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </label>
            </div>

            <Button disabled={isLoading} type="submit" className="mt-2 h-[52px] w-full font-medium shadow-[0_0_15px_rgba(39,117,255,0.2)] hover:shadow-[0_0_20px_rgba(39,117,255,0.4)] transition-all bg-primary hover:bg-primary/90 text-white">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-muted-foreground bg-card/40 backdrop-blur-md">
              Or continue with
            </span>
          </div>
        </div>
        
        <SocialLoginButton provider="google" disabled={isLoading} className="h-12 border-border bg-transparent hover:bg-secondary">
          Continue with Google
        </SocialLoginButton>
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground mt-3">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
