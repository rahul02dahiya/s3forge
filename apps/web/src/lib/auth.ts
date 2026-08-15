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
  
  // Assuming the API returns { token: "..." } or similar
  if ((data as any)?.token) {
    localStorage.setItem("token", (data as any).token);
  }
  
  return data;
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
  
  if ((data as any)?.token) {
    localStorage.setItem("token", (data as any).token);
  }
  
  return data;
}

export async function signOut() {
  localStorage.removeItem("token");
  return Promise.resolve();
}

export async function requestPasswordReset(_email: string) {
  // Mock function as /auth/forgot-password is not in the OpenAPI schema yet
  console.warn("Forgot password API not yet implemented on the backend");
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

export async function resetPassword() {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}
