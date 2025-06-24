import React, { useState } from 'react'
import { CreditCard, Loader } from 'lucide-react'

interface PaystackButtonProps {
  email: string
  amount: number
  onSuccess: (reference: string) => void
  onClose?: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

const PaystackButton: React.FC<PaystackButtonProps> = ({
  email,
  amount,
  onSuccess,
  onClose,
  disabled = false,
  children,
  className = ''
}) => {
  const [loading, setLoading] = useState(false)

  const handlePayment = () => {
    setLoading(true)
    
    // Check if Paystack is loaded
    if (typeof window.PaystackPop === 'undefined') {
      console.error('Paystack not loaded')
      setLoading(false)
      return
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: amount * 100, // Convert to kobo
      currency: 'NGN',
      callback: function(response: any) {
        setLoading(false)
        onSuccess(response.reference)
      },
      onClose: function() {
        setLoading(false)
        if (onClose) onClose()
      }
    })

    handler.openIframe()
  }

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`flex items-center justify-center space-x-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader className="w-5 h-5 animate-spin" />
      ) : (
        <CreditCard className="w-5 h-5" />
      )}
      <span>{loading ? 'Processing...' : children}</span>
    </button>
  )
}

export default PaystackButton