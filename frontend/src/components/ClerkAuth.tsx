// src/components/ClerkAuth.tsx

import React from 'react'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

interface ClerkAuthProps {
  mode: 'sign-in' | 'sign-up'
  onSuccess: () => void
}

const ClerkAuth: React.FC<ClerkAuthProps> = ({ mode, onSuccess }) => {
  const { user } = useUser()
  const navigate = useNavigate()

  // Debug информация
  React.useEffect(() => {
    console.log('🔧 Clerk Debug Info:')
    console.log('- Publishable Key:', (import.meta as any).env?.VITE_CLERK_PUBLIC_KEY?.substring(0, 20) + '...')
    console.log('- Mode:', mode)
    console.log('- User:', user ? 'Authenticated' : 'Not authenticated')
    
    // Проверяем через 3 секунды появились ли Google кнопки
    setTimeout(() => {
      const googleButton = document.querySelector('[data-provider="google"]') || 
                          document.querySelector('[data-clerk-oauth-provider="google"]') ||
                          document.querySelector('button[aria-label*="Google"]')
      
      // Ищем кнопки с текстом Google через textContent
      const allButtons = Array.from(document.querySelectorAll('button'))
      const googleTextButton = allButtons.find(btn => 
        btn.textContent?.toLowerCase().includes('google') ||
        btn.innerHTML.toLowerCase().includes('google')
      )
      
      const foundButton = googleButton || googleTextButton
      console.log('🔍 Google button found:', !!foundButton)
      console.log('🔍 Found button element:', foundButton)
      
      if (!foundButton) {
        console.warn('⚠️ Google OAuth button not found. Check Clerk Dashboard SSO connections.')
        console.log('🔍 All buttons on page:', allButtons.map(btn => btn.textContent))
      }
    }, 3000)
  }, [mode, user])

  // Если пользователь уже авторизован, перенаправляем на dashboard
  React.useEffect(() => {
    if (user) {
      console.log('✅ User authenticated, redirecting to dashboard')
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const appearance = {
    elements: {
      formButtonPrimary: 
        'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
      card: 'bg-white rounded-xl shadow-lg border border-gray-200',
      headerTitle: 'text-2xl font-bold text-gray-900',
      headerSubtitle: 'text-gray-600',
      socialButtonsBlockButton: 
        'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2',
      formFieldInput: 
        'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      footerActionLink: 'text-blue-600 hover:text-blue-700 font-medium',
      socialButtonsBlockButtonText: 'font-medium',
    },
    variables: {
      colorPrimary: '#2563eb',
      colorTextOnPrimaryBackground: '#ffffff',
      colorBackground: '#ffffff',
      colorInputBackground: '#ffffff',
      colorInputText: '#1f2937',
      borderRadius: '0.5rem',
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {mode === 'sign-in' ? (
        <SignIn 
          appearance={appearance}
          routing="virtual"
          signUpUrl="/login?mode=sign-up"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      ) : (
        <SignUp 
          appearance={appearance}
          routing="virtual"
          signInUrl="/login?mode=sign-in"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      )}
    </div>
  )
}

export default ClerkAuth 