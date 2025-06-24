import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  name: string
  email: string
  role: 'student' | 'landlord'
  phone: string | null
  is_verified: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, userData: { name: string; role: 'student' | 'landlord'; phone?: string }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Clear any stale session data on mount
  useEffect(() => {
    const clearStaleData = async () => {
      try {
        // Clear any cached session data
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
        
        // Force refresh the session
        await supabase.auth.refreshSession()
      } catch (error) {
        console.log('Session refresh failed, continuing with fresh start')
      }
    }

    if (!initialized) {
      clearStaleData()
      setInitialized(true)
    }
  }, [initialized])

  useEffect(() => {
    let mounted = true
    const maxRetries = 3

    const initializeAuth = async () => {
      if (!initialized) return

      try {
        console.log('🔍 Initializing auth system...')
        setLoading(true)

        // Get current session with retry logic
        const getSessionWithRetry = async (): Promise<any> => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              const { data, error } = await supabase.auth.getSession()
              if (error) throw error
              return data
            } catch (error) {
              console.warn(`Session attempt ${i + 1} failed:`, error)
              if (i === maxRetries - 1) throw error
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
            }
          }
        }

        const { session } = await getSessionWithRetry()
        
        console.log('✅ Session retrieved:', session?.user?.id || 'No session')
        
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfileWithRetry(session.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Set up auth state listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id)
      
      if (!mounted) return

      try {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfileWithRetry(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized])

  const fetchProfileWithRetry = async (userId: string) => {
    const maxRetries = 3
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`👤 Fetching profile for user: ${userId} (attempt ${i + 1})`)
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('⚠️ Profile not found - user may need to complete registration')
            setProfile(null)
            setLoading(false)
            return
          }
          throw error
        }

        console.log('✅ Profile fetched successfully:', data)
        setProfile(data)
        setLoading(false)
        return
      } catch (error) {
        console.error(`❌ Profile fetch attempt ${i + 1} failed:`, error)
        if (i === maxRetries - 1) {
          console.log('⚠️ All profile fetch attempts failed')
          setProfile(null)
          setLoading(false)
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }
  }

  const refreshAuth = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      if (data.session?.user) {
        await fetchProfileWithRetry(data.session.user.id)
      }
    } catch (error) {
      console.error('❌ Auth refresh failed:', error)
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: { name: string; role: 'student' | 'landlord'; phone?: string }) => {
    try {
      setLoading(true)
      console.log('📝 Starting signup process for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('❌ Signup error:', error)
        throw error
      }

      if (data.user) {
        console.log('👤 User created, creating profile:', data.user.id)
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name: userData.name,
            role: userData.role,
            phone: userData.phone || null,
            is_verified: userData.role === 'student'
          })

        if (profileError) {
          console.error('❌ Profile creation error:', profileError)
          throw profileError
        }

        console.log('✅ Profile created successfully')
        toast.success('Account created successfully!')
        
        // Fetch the newly created profile
        await fetchProfileWithRetry(data.user.id)
      }
    } catch (error: any) {
      console.error('❌ SignUp error:', error)
      setLoading(false)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('🔐 Starting signin process for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ SignIn error:', error)
        setLoading(false)
        throw error
      }

      console.log('✅ Sign in successful:', data.user?.id)
      toast.success('Welcome back!')
      
      // Profile will be fetched by the auth state change listener
    } catch (error: any) {
      console.error('❌ SignIn error:', error)
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Clear local state first
      setUser(null)
      setProfile(null)
      
      // Clear any cached data
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ SignOut error:', error)
        throw error
      }
      
      setLoading(false)
      toast.success('Signed out successfully')
    } catch (error: any) {
      console.error('❌ SignOut error:', error)
      setLoading(false)
      throw error
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}