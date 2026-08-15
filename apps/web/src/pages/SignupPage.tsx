import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordInput } from "../components/auth/PasswordInput";
import { SocialLoginButton } from "../components/auth/SocialLoginButton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import { signUp } from "../lib/auth";

const signupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  terms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and privacy policy",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const terms = watch("terms");

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    try {
      await signUp({
        email: data.email,
        password: data.password,
        displayName: data.name
      });
      toast.success("Account created successfully");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your S3Forge account"
      className="max-h-[calc(100dvh-32px)]"
    >
      <div className="flex flex-col gap-2">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="name" className="text-foreground">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-[11px] h-5 w-5 text-muted-foreground z-10" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  autoComplete="name"
                  disabled={isLoading}
                  className="pl-10 h-[42px] bg-input/40 border-border focus-visible:ring-primary shadow-sm"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="email" className="text-foreground">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-[11px] h-5 w-5 text-muted-foreground z-10" />
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  className="pl-10 h-[42px] bg-input/40 border-border focus-visible:ring-primary shadow-sm"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                className="h-[42px] bg-input/40 border-border focus-visible:ring-primary shadow-sm"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                className="h-[42px] bg-input/40 border-border focus-visible:ring-primary shadow-sm"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-3 mt-0.5">
              <Checkbox
                id="terms"
                checked={terms}
                onCheckedChange={(checked) => setValue("terms", checked as boolean, { shouldValidate: true })}
                disabled={isLoading}
                className="mt-0.5 border-border bg-input/40"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </label>
                {errors.terms && (
                  <p className="text-sm text-destructive mt-1">{errors.terms.message}</p>
                )}
              </div>
            </div>

            <Button disabled={isLoading} type="submit" className="mt-1 h-[44px] w-full font-medium shadow-[0_0_15px_rgba(39,117,255,0.2)] hover:shadow-[0_0_20px_rgba(39,117,255,0.4)] transition-all bg-primary hover:bg-primary/90 text-white">
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-muted-foreground bg-card/40 backdrop-blur-md">
              Or continue with
            </span>
          </div>
        </div>

        <SocialLoginButton provider="google" disabled={isLoading} className="h-[44px] border-border bg-transparent hover:bg-secondary">
          Continue with Google
        </SocialLoginButton>
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground mt-1">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
