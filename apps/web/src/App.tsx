import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { Toaster } from './components/ui/sonner'
import './App.css'

function Home() {
  return (
    <main className="app-shell p-10 flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-4xl font-bold mb-4">S3Forge</h1>
      <p className="text-xl text-muted-foreground mb-8">A self-hosted S3-compatible storage platform.</p>
      <div className="flex gap-4">
        <a href="/login" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Sign In</a>
        <a href="/signup" className="px-4 py-2 border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground">Sign Up</a>
      </div>
    </main>
  )
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App
