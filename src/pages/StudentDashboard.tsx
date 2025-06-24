import React, { useState, useEffect } from 'react'
import { Calendar, MapPin, Phone, Mail, RefreshCw, Eye, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, calculateReservationFee } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

interface Reservation {
  id: string
  property_id: string
  payment_status: 'pending' | 'paid' | 'refunded'
  unlock_granted: boolean
  created_at: string
  properties: {
    id: string
    title: string
    location: string
    price: number
    total_rooms: number
    images: string[]
    landlord_id: string
  }
  landlords: {
    name: string
    email: string
    phone: string | null
  }
}

const StudentDashboard: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, profile, loading: authLoading, refreshAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('📊 StudentDashboard useEffect - Auth loading:', authLoading, 'User:', user?.id, 'Profile role:', profile?.role)
    
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      return
    }

    // If no user is authenticated, redirect to auth page
    if (!user) {
      console.log('🔐 No user found, redirecting to auth')
      navigate('/auth')
      return
    }

    // If user is not a student, redirect to explore page
    if (profile && profile.role !== 'student') {
      console.log('👤 User is not a student, redirecting to explore')
      navigate('/explore')
      return
    }

    // If we have a user but no profile yet, try to refresh auth
    if (user && !profile) {
      console.log('⏳ User exists but no profile yet, refreshing auth...')
      refreshAuth()
      return
    }

    // If user is authenticated and is a student, fetch reservations
    if (user && profile && profile.role === 'student') {
      console.log('✅ Fetching reservations for student:', user.id)
      fetchReservations()
    }
  }, [user, profile, authLoading, navigate, refreshAuth])

  const fetchReservations = async () => {
    if (!user) {
      console.log('❌ No user available for fetching reservations')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('📋 Fetching reservations for user:', user.id)
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          properties (
            id,
            title,
            location,
            price,
            total_rooms,
            images,
            landlord_id
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching reservations:', error)
        throw error
      }

      console.log('✅ Reservations fetched successfully:', data?.length || 0, 'items')
      
      // Now fetch landlord data for each reservation
      const reservationsWithLandlords = await Promise.all(
        (data || []).map(async (reservation) => {
          if (reservation.properties?.landlord_id) {
            try {
              const { data: landlordData } = await supabase
                .from('users')
                .select('name, email, phone')
                .eq('id', reservation.properties.landlord_id)
                .single()
              
              return {
                ...reservation,
                landlords: landlordData
              }
            } catch (landlordError) {
              console.error('⚠️ Could not fetch landlord for reservation:', reservation.id)
              return {
                ...reservation,
                landlords: null
              }
            }
          }
          return {
            ...reservation,
            landlords: null
          }
        })
      )

      setReservations(reservationsWithLandlords)
    } catch (error: any) {
      console.error('❌ Error in fetchReservations:', error)
      setError('Failed to load your reservations. Please try again.')
      toast.error('Failed to load your reservations')
    } finally {
      setLoading(false)
    }
  }

  const requestRefund = async (reservationId: string) => {
    if (!confirm('Are you sure you want to request a refund? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ payment_status: 'refunded' })
        .eq('id', reservationId)

      if (error) throw error
      toast.success('Refund requested successfully! We will process it within 3-5 business days.')
      fetchReservations()
    } catch (error) {
      console.error('❌ Error requesting refund:', error)
      toast.error('Failed to request refund')
    }
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, this will be handled by the useEffect redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // If not a student, this will be handled by the useEffect redirect
  if (profile && profile.role !== 'student') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Show loading state while fetching reservations
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetchReservations()
            }}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {profile?.name}! Manage your property reservations and bookings
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Reservations</p>
                <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Unlocked Properties</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reservations.filter(r => r.unlock_granted).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Refund Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reservations.filter(r => r.payment_status === 'refunded').length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <RefreshCw className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reservations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Your Reservations</h2>
          </div>

          {reservations.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {reservations.map((reservation) => {
                const individualRent = reservation.properties?.price && reservation.properties?.total_rooms 
                  ? reservation.properties.price / reservation.properties.total_rooms 
                  : 0
                const reservationFee = reservation.properties?.price && reservation.properties?.total_rooms
                  ? calculateReservationFee(reservation.properties.price, reservation.properties.total_rooms)
                  : 0

                return (
                  <div key={reservation.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <img
                          src={reservation.properties?.images?.[0] || 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'}
                          alt={reservation.properties?.title || 'Property'}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {reservation.properties?.title || 'Property Title'}
                          </h3>
                          <div className="flex items-center text-gray-600 mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="text-sm">{reservation.properties?.location || 'Location'}</span>
                          </div>
                          <div className="flex items-center space-x-4 mb-3">
                            <span className="text-lg font-bold text-gray-900">
                              ₦{reservation.properties?.price?.toLocaleString() || '0'}/session
                            </span>
                            <span className="text-sm text-gray-600">
                              (₦{individualRent.toLocaleString()}/space)
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              reservation.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-800'
                                : reservation.payment_status === 'refunded'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {reservation.payment_status === 'paid' ? 'Paid' : 
                               reservation.payment_status === 'refunded' ? 'Refunded' : 'Pending'}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Reservation fee paid:</span> ₦{reservationFee.toLocaleString()}
                          </div>

                          {reservation.unlock_granted && reservation.landlords && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                              <h4 className="font-semibold text-green-800 mb-2">Landlord Contact</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center text-green-700">
                                  <Mail className="w-4 h-4 mr-2" />
                                  <span>{reservation.landlords.name} - {reservation.landlords.email}</span>
                                </div>
                                {reservation.landlords.phone && (
                                  <div className="flex items-center text-green-700">
                                    <Phone className="w-4 h-4 mr-2" />
                                    <a 
                                      href={`tel:${reservation.landlords.phone}`}
                                      className="hover:text-green-800"
                                    >
                                      {reservation.landlords.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            Reserved on {new Date(reservation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Link
                          to={`/property/${reservation.property_id}`}
                          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600 transition-colors text-center"
                        >
                          View Property
                        </Link>
                        
                        {reservation.payment_status === 'paid' && (
                          <button
                            onClick={() => requestRefund(reservation.id)}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition-colors flex items-center space-x-1"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Request Refund</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <AlertCircle className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reservations yet</h3>
              <p className="text-gray-600 mb-6">
                Start exploring properties to find your perfect student space
              </p>
              <Link
                to="/explore"
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Explore Properties
              </Link>
            </div>
          )}
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8"
        >
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h3>
            <p className="text-gray-600 mb-6">
              Have questions about your reservations or need assistance with refunds?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@havenix.com"
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="https://wa.me/2348000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                WhatsApp Support
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default StudentDashboard