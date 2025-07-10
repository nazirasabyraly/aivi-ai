// src/App.tsx

import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider, useUser } from '@clerk/clerk-react'
import Landing from './pages/landing'
import Login from './pages/login'
import VerifyEmail from './pages/verify-email'
import Callback from './pages/callback'
import Setup from './pages/setup'
import Dashboard from './pages/dashboard'
import LanguageSwitcher from './components/LanguageSwitcher'

// Получаем Clerk Publishable Key из переменных окружения
const clerkPubKey = (import.meta as any).env?.VITE_CLERK_PUBLIC_KEY

if (!clerkPubKey) {
  console.warn('⚠️ VITE_CLERK_PUBLIC_KEY не найден в переменных окружения')
}

const App = () => {
  return (
    <ClerkProvider 
      publishableKey={clerkPubKey || ''}
      telemetry={false}
      supportEmail="support@aivi-ai.it.com"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      signInUrl="/login"
      signUpUrl="/login"
    >
      <div>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
          <LanguageSwitcher />
        </div>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ClerkProvider>
  )
}

export default App
