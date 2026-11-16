import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { BucketsPage } from './pages/BucketsPage'
import { BucketDetailsPage } from './pages/BucketDetailsPage'
import { CredentialsPage } from './pages/CredentialsPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { Toaster } from './components/ui/sonner'
import { useAuth } from './hooks/useAuth'
import './App.css'

function AuthRedirect() {
  const { data: user, isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v12a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 01-2 2H2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 10h4m0 0h4m-4 0v4m0-4v-4" />
          </svg>
          <p className="text-muted-foreground">Loading S3Forge...</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/buckets" element={<BucketsPage />} />
            <Route path="/buckets/:bucketName" element={<BucketDetailsPage />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App
