import { apiClient } from "./api/client";
import type { components } from "./api/schema";

type LoginInput = components["schemas"]["LoginInput"];
type RegisterInput = components["schemas"]["RegisterInput"];

export async function signIn(input: LoginInput) {
  const { data, error } = await apiClient.POST("/auth/login", {
    body: input,
  });
  
  if (error) {
    throw new Error(
      (error as any)?.message || 
      (typeof error === "string" ? error : "Invalid credentials")
    );
  }
  
  // The backend uses sendSuccess which wraps the payload in `data`
  const payload = (data as any)?.data;
  if (payload?.token) {
    localStorage.setItem("token", payload.token);
  }
  
  return payload;
}

export async function signUp(input: RegisterInput) {
  const { data, error } = await apiClient.POST("/auth/register", {
    body: input,
  });
  
  if (error) {
    throw new Error(
      (error as any)?.message || 
      (typeof error === "string" ? error : "Registration failed")
    );
  }
  
  const payload = (data as any)?.data;
  if (payload?.token) {
    localStorage.setItem("token", payload.token);
  }
  
  return payload;
}

export async function signOut() {
  localStorage.removeItem("token");
  return Promise.resolve();
}

export async function requestPasswordReset(email: string) {
  const { data, error } = await apiClient.POST("/auth/forgot-password", {
    body: { email },
  });

  if (error) {
    throw new Error((error as any)?.message || "Failed to request password reset");
  }

  return (data as any)?.data ?? null;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data, error } = await apiClient.POST("/auth/reset-password", {
    body: { token, newPassword },
  });

  if (error) {
    throw new Error((error as any)?.message || "Failed to reset password");
  }

  return (data as any)?.data ?? null;
}
