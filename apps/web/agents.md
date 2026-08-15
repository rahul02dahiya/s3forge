# S3Forge Web - Agent Documentation

This document serves as the context and guideline for AI agents (and developers) working on the **S3Forge Web** frontend application. It outlines the project's architecture, technology stack, current state, and development best practices based on the latest implementations.

## Project Overview
S3Forge is a self-hosted S3-compatible storage platform. The web application (`apps/web`) is the frontend dashboard for managing and interacting with S3Forge.

## Technology Stack
- **Framework**: React 19 powered by Vite
- **Language**: TypeScript
- **Routing**: React Router DOM (v7)
- **Styling**: Tailwind CSS (v4) with Shadcn UI (Radix UI primitives)
- **Form Management**: React Hook Form + Zod
- **API Client**: `openapi-fetch` (generated from OpenAPI specs using `openapi-typescript`)
- **State Management & Data Fetching**: React Query (installed, to be used alongside API client)
- **Icons**: Lucide React
- **Notifications**: Sonner (`toast`)

## Architecture & Codebase Structure
The application follows a standard scalable React folder structure:

- **`/src/components`**: Reusable UI components.
  - **`/auth`**: Domain-specific components for authentication (e.g., `AuthLayout`, `PasswordInput`, `SocialLoginButton`).
  - **`/ui`**: Generic, foundational UI components provided by Shadcn (Button, Input, Label, Checkbox, etc.).
- **`/src/pages`**: Top-level route components mapped to specific URLs (`LoginPage`, `SignupPage`, `ForgotPasswordPage`, `ResetPasswordPage`).
- **`/src/lib`**: Core utilities, services, and API configurations.
  - **`/api/client.ts`**: The configured `openapi-fetch` client with request interceptors (e.g., attaching Bearer tokens).
  - **`/api/schema.d.ts`**: Auto-generated TypeScript interfaces mapping the backend's OpenAPI JSON.
  - **`auth.ts`**: The authentication service containing logic to interface with the backend endpoints (`signIn`, `signUp`).
- **`/src/App.tsx`**: Main application entry point containing the router configuration.

## Current State & Recent Implementations
The most recent major integration focused on the **Authentication Flow**:

1. **API Client & Type Safety**: 
   - A type-safe API client was configured using `openapi-fetch`. 
   - Types are automatically generated from the backend's `openapi.json` into `schema.d.ts`.
   - The `client.ts` file includes a request interceptor that automatically attaches the JWT token from `localStorage` to all outgoing API requests.

2. **Auth Service (`auth.ts`)**: 
   - Implemented `signIn` and `signUp` wrapper functions that communicate with `/auth/login` and `/auth/register` endpoints.
   - Integrated token storage mechanisms upon successful authentication.

3. **User Interface Integration**:
   - **`LoginPage.tsx`**: Validates user input (email, password) using Zod. Calls `signIn` and routes the user to the dashboard on success, displaying a success or error toast.
   - **`SignupPage.tsx`**: Validates new user registration, including password confirmation logic and terms of service acceptance. Calls `signUp` and routes the user to the login view on success.
   - Built out shell pages for password recovery (`ForgotPasswordPage`, `ResetPasswordPage`).

## Development Best Practices & Guidelines

When generating code or suggesting modifications, agents must adhere to the following rules:

1. **Strict Type Safety**: 
   - **Do not manually define API request or response interfaces when the type can be generated from the OpenAPI specification. If a required response type is missing, improve the OpenAPI response schema and regenerate `schema.d.ts` instead of duplicating backend types in the frontend.**

2. **Form Handling & Validation**: 
   - Strictly use `react-hook-form` in combination with `@hookform/resolvers/zod` for all form-based data entry. 
   - Ensure comprehensive validation (e.g., email formats, password strength, matching fields).

3. **Component Modularity**: 
   - Keep UI components isolated in `src/components/ui`. 
   - Construct domain-specific components in their respective subfolders (like `src/components/auth`). 
   - Page-level components should remain in `src/pages` and focus primarily on layout, routing, and data aggregation.

4. **Error Handling & UX**: 
   - Use `toast` from Sonner for user-friendly notifications (both success and failure) during asynchronous operations.
   - Ensure buttons and inputs are disabled (`disabled={isLoading}`) while network requests are in flight to prevent duplicate submissions.

5. **Styling Conventions**: 
   - Use Tailwind CSS utility classes for styling. Avoid writing custom CSS in `.css` files unless absolutely necessary (e.g., global resets or complex animations).
   - Leverage the existing Shadcn UI components for a cohesive design language.

6. **Authentication Management**: 
   - Rely on `localStorage` for persisting the authentication token. 
   - Trust the interceptor in `client.ts` to attach the token; avoid manually passing the token in component-level fetch calls.
