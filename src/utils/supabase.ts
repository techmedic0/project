import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
    actualUrl: supabaseUrl,
    actualKey: supabaseAnonKey ? 'Present' : 'Missing'
  })
  throw new Error('Missing Supabase environment variables')
}

console.log('🔧 Supabase client initialized with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }
})

// Enhanced connection test with retry logic
export const testConnection = async () => {
  const maxRetries = 3
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🧪 Testing Supabase connection (attempt ${i + 1})...`)
      const { error } = await supabase.from('properties').select('count').limit(1)
      if (error) {
        console.error(`❌ Connection test ${i + 1} failed:`, error)
        if (i === maxRetries - 1) return false
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }
      console.log('✅ Supabase connection test successful')
      return true
    } catch (error) {
      console.error(`❌ Connection test ${i + 1} error:`, error)
      if (i === maxRetries - 1) return false
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  return false
}

// Utility function to calculate reservation fee
export const calculateReservationFee = (totalRent: number, totalSpaces: number): number => {
  const individualRent = totalRent / totalSpaces
  return Math.round(individualRent * 0.01) // 1% of individual rent
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'student' | 'landlord'
          phone: string | null
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role: 'student' | 'landlord'
          phone?: string | null
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'student' | 'landlord'
          phone?: string | null
          is_verified?: boolean
          created_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          title: string
          description: string
          location: string
          detailed_location: string
          rooms_available: number
          total_rooms: number
          price: number
          tier: 'low' | 'mid' | 'premium'
          reservation_fee: number
          is_verified: boolean
          images: string[]
          video_url: string | null
          landlord_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          location: string
          detailed_location: string
          rooms_available: number
          total_rooms: number
          price: number
          tier: 'low' | 'mid' | 'premium'
          reservation_fee: number
          is_verified?: boolean
          images: string[]
          video_url?: string | null
          landlord_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          location?: string
          detailed_location?: string
          rooms_available?: number
          total_rooms?: number
          price?: number
          tier?: 'low' | 'mid' | 'premium'
          reservation_fee?: number
          is_verified?: boolean
          images?: string[]
          video_url?: string | null
          landlord_id?: string
          created_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          student_id: string
          property_id: string
          payment_status: 'pending' | 'paid' | 'refunded'
          unlock_granted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          property_id: string
          payment_status?: 'pending' | 'paid' | 'refunded'
          unlock_granted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          property_id?: string
          payment_status?: 'pending' | 'paid' | 'refunded'
          unlock_granted?: boolean
          created_at?: string
        }
      }
    }
  }
}