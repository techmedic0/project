import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase'

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

  // Fetch user profile from DB
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      setProfile(data)
    } catch (error) {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // Restore session and profile on mount
  useEffect(() => {
    let mounted = true
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshAuth = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      setLoading(false)
      return
    }
    if (data.session?.user) {
      setUser(data.session.user)
      await fetchProfile(data.session.user.id)
    } else {
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: { name: string; role: 'student' | 'landlord'; phone?: string }) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email!,
        name: userData.name,
        role: userData.role,
        phone: userData.phone || null,
        is_verified: userData.role === 'student'
      })
      await fetchProfile(data.user.id)
    }
    setLoading(false)
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }
    if (data.user) {
      await fetchProfile(data.user.id)
    }
    setLoading(false)
  }

  const signOut = async () => {
    setLoading(true)
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
    setLoading(false)
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