// src/components/ClerkAuth.tsx

import React from 'react'
import { SignIn, SignUp, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

interface ClerkAuthProps {
  mode: 'sign-in' | 'sign-up'
  onSuccess?: () => void
}

const ClerkAuth: React.FC<ClerkAuthProps> = ({ mode, onSuccess }) => {
  const { user } = useUser()
  const navigate = useNavigate()

  // Если пользователь уже авторизован, перенаправляем на dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard')
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
        'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200',
      formFieldInput: 
        'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      footerActionLink: 'text-blue-600 hover:text-blue-700 font-medium',
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

  if (mode === 'sign-up') {
    return (
      <div className="clerk-auth-container">
        <SignUp 
          appearance={appearance}
          routing="virtual"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      </div>
    )
  }

  return (
    <div className="clerk-auth-container">
      <SignIn 
        appearance={appearance}
        routing="virtual"
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
      />
    </div>
  )
}

export default ClerkAuth 