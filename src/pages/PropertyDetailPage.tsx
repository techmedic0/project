import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Users, Phone, Mail, Lock, CheckCircle, ArrowLeft, Calendar, Shield, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase, calculateReservationFee } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
import PaystackButton from '../components/PaystackButton'
import toast from 'react-hot-toast'


interface Property {
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

interface Landlord {
  id: string
  name: string
  email: string
  phone: string | null
}

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile, refreshAuth } = useAuth()
  
  const [property, setProperty] = useState<Property | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMedia, setModalMedia] = useState<string | null>(null)
  const [modalType, setModalType] = useState<'image' | 'video' | null>(null)

  useEffect(() => {
    if (id) {
      fetchProperty()
    } else {
      setError('No property ID provided')
      setLoading(false)
    }
  }, [id, user])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🏠 Fetching property with ID:', id)

      // Refresh auth if needed
      if (user && !profile) {
        await refreshAuth()
      }

      // First, try to fetch the property (both verified and unverified for landlords)
      let propertyQuery = supabase
        .from('properties')
        .select('*')
        .eq('id', id)

      // If user is authenticated and is the landlord, they can see unverified properties
      if (!user || (profile && profile.role === 'student')) {
        propertyQuery = propertyQuery.eq('is_verified', true)
      }

      const { data: propertyData, error: propertyError } = await propertyQuery.maybeSingle()

      if (propertyError) {
        console.error('❌ Property fetch error:', propertyError)
        setError('Failed to load property details')
        setLoading(false)
        return
      }

      if (!propertyData) {
        console.log('⚠️ Property not found or not verified')
        setError('Property not found or not available')
        setLoading(false)
        return
      }

      console.log('✅ Property fetched:', propertyData)
      setProperty(propertyData)

      // Fetch landlord details
      try {
        const { data: landlordData, error: landlordError } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', propertyData.landlord_id)
          .single()

        if (landlordError) {
          console.error('⚠️ Landlord fetch error:', landlordError)
          // Don't fail the whole page if landlord data is missing
        } else {
          console.log('✅ Landlord fetched:', landlordData)
          setLandlord(landlordData)
        }
      } catch (landlordFetchError) {
        console.error('⚠️ Could not fetch landlord data:', landlordFetchError)
      }

      // Check if user has unlocked this property
      if (user) {
        try {
          console.log('🔓 Checking unlock status for user:', user.id)
          const { data: reservationData, error: reservationError } = await supabase
            .from('reservations')
            .select('unlock_granted')
            .eq('student_id', user.id)
            .eq('property_id', id)
            .eq('unlock_granted', true)
            .maybeSingle()

          if (reservationError) {
            console.error('⚠️ Reservation check error:', reservationError)
          } else {
            console.log('✅ Unlock status:', !!reservationData)
            setIsUnlocked(!!reservationData)
          }
        } catch (reservationCheckError) {
          console.error('⚠️ Could not check unlock status:', reservationCheckError)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('❌ Error in fetchProperty:', error)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    if (!user || !property) return

    setPaymentLoading(true)
    try {
    // Check for existing reservation
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('student_id', user.id)
      .eq('property_id', property.id)
      .maybeSingle();

    if (existing) {
      toast('You have already unlocked this property.');
      setIsUnlocked(true);
      setPaymentLoading(false);
      return;
    }
      
      // Create reservation record
      const { error: reservationError } = await supabase
        .from('reservations')
        .insert({
          student_id: user.id,
          property_id: property.id,
          payment_status: 'paid',
          unlock_granted: true
        })

      if (reservationError) {
        console.error('❌ Reservation creation error:', reservationError)
        throw reservationError
      }

      // Reduce available rooms by 1
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          rooms_available: Math.max(0, property.rooms_available - 1)
        })
        .eq('id', property.id)

      if (updateError) {
        console.error('❌ Room update error:', updateError)
        // Don't throw here as the reservation was already created
        console.log('⚠️ Room count update failed but reservation was successful')
      }

      console.log('✅ Reservation created successfully')
      setIsUnlocked(true)
      toast.success('Property unlocked! You can now view full details and contact the landlord.')
      
      // Refetch property data to get updated info
      await supabase.rpc('decrement_rooms', { property_id: property.id })
      const { data: fresh } = await supabase
          .from('properties')
          .select('rooms_available')
          .eq('id', property.id)
          .single()
        const newRooms = Math.max(0, (fresh?.rooms_available ?? property.rooms_available) - 1)
        await supabase
          .from('properties')
          .update({ rooms_available: newRooms })
          .eq('id', property.id)
      await fetchProperty()
    } catch (error) {
      console.error('❌ Error processing payment:', error)
      toast.error('Payment processed but failed to unlock property. Please contact support.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const generateWhatsAppLink = () => {
    if (!landlord?.phone || !property) return '#'
    
    const message = `Hi! I'm interested in your property "${property.title}" listed on Havenix. I have unlocked the details and would like to schedule a viewing. Available spaces: ${property.rooms_available}/${property.total_rooms}`
    const encodedMessage = encodeURIComponent(message)
    const phoneNumber = landlord.phone.replace(/[^\d]/g, '') // Remove non-digits
    
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex overflow-x-hidden items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Property not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back to Explore
          </button>
        </div>
      </div>
    )
  }

  /* const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'from-yellow-400 to-orange-500'
      case 'mid': return 'from-blue-400 to-purple-500'
      default: return 'from-green-400 to-blue-500'
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'premium': return 'Premium'
      case 'mid': return 'Standard'
      default: return 'Budget'
    }
  } */

  // Calculate dynamic reservation fee
  const dynamicReservationFee = calculateReservationFee(property.price, property.total_rooms)
  const individualRent = property.price / property.total_rooms

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/explore')}
          className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Explore</span>
        </motion.button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
       
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-8"
            >
              <div className="w-full rounded-2xl overflow-hidden bg-gray-200">
                <div className="flex flex-col gap-4">
                  {(property.images && property.images.length > 0 ? property.images : [
                    'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'
                  ]).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Property image ${idx + 1}`}
                      className="w-full max-h-72 sm:max-h-96 object-cover rounded-2xl cursor-pointer"
                      onClick={() => {
                        setModalMedia(img)
                        setModalType('image')
                        setModalOpen(true)
                      }}
                    />
                  ))}
                  {property.video_url && isUnlocked && (
                    <video
                      controls
                      className="w-full max-h-72 sm:max-h-96 object-cover rounded-2xl cursor-pointer"
                      onClick={() => {
                        setModalMedia(property.video_url!)
                        setModalType('video')
                        setModalOpen(true)
                      }}
                    >
                      <source src={property.video_url!} />
                    </video>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Fullscreen Modal for Media */}
            {modalOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2"
                onClick={() => setModalOpen(false)}
                style={{ cursor: 'zoom-out' }}
              >
                {modalType === 'image' && (
                  <img
                    src={modalMedia!}
                    alt="Full view"
                    className="max-h-[90vh] max-w-[96vw] w-auto h-auto rounded-lg shadow-lg"
                  />
                )}
                {modalType === 'video' && (
                  <video
                    controls
                    autoPlay
                    className="max-h-[90vh] max-w-[96vw] w-auto h-auto rounded-lg shadow-lg"
                  >
                    <source src={modalMedia!} />
                  </video>
                )}
              </div>
            )}

            {/* Property Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-8 mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {property.title}
              </h1>
              
              <div className="flex items-center text-gray-600 mb-6">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="text-lg">{property.location}</span>
              </div>

              {/* Detailed Location - Only shown if unlocked */}
              {isUnlocked && property.detailed_location && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Detailed Location (Unlocked)
                  </h4>
                  <p className="text-green-700 text-sm">
                    {property.detailed_location}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Available Spaces</p>
                    <p className="text-gray-600">{property.rooms_available} out of {property.total_rooms}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Verification Status</p>
                    <p className="text-gray-600">{property.is_verified ? 'Verified' : 'Pending'}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Pricing Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total session rent:</span>
                    <span className="font-medium">₦{property.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Individual space rent:</span>
                    <span className="font-medium">₦{individualRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Reservation fee (1%):</span>
                    <span className="font-medium text-primary-600">₦{dynamicReservationFee.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {property.description}
                </p>
              </div>
            </motion.div>

            {/* Video Tour */}
            {property.video_url && isUnlocked && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-lg p-8 mb-8"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Video Tour</h3>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={property.video_url}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Pricing Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-8 mb-8 sticky top-8"
            >
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ₦{property.price.toLocaleString()}
                </div>
                <div className="text-gray-600">per session (total)</div>
                <div className="text-lg font-semibold text-primary-600 mt-1">
                  ₦{individualRent.toLocaleString()} per space
                </div>
              </div>

              {property.rooms_available === 0 ? (
                <div className="text-center">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-700 font-semibold">Fully Booked</p>
                    <p className="text-red-600 text-sm">No spaces available at the moment</p>
                  </div>
                </div>
              ) : !isUnlocked && user && profile?.role === 'student' ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-4">
                    <div className="flex items-center text-primary-700 mb-2">
                      <Lock className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Unlock Full Details</span>
                    </div>
                    <p className="text-sm text-primary-600 mb-3">
                      Pay ₦{dynamicReservationFee.toLocaleString()} to unlock landlord contact, exact location, and book a viewing.
                    </p>
                    <div className="text-xs text-primary-500">
                      • Partial refund if not satisfied after viewing
                      • Direct contact with verified landlord
                      • Priority booking for available spaces
                      • Detailed location and directions
                    </div>
                  </div>

                  <PaystackButton
                    email={user.email || ''}
                    amount={dynamicReservationFee}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => setPaymentLoading(false)}
                    disabled={paymentLoading}
                    className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-4 rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 disabled:opacity-50"
                  >
                    {paymentLoading ? 'Processing...' : `Unlock for ₦${dynamicReservationFee.toLocaleString()}`}
                  </PaystackButton>
                </div>
              ) : isUnlocked && landlord ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center text-green-700 mb-2">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Property Unlocked!</span>
                    </div>
                    <p className="text-sm text-green-600">
                      You can now contact the landlord directly and schedule a viewing.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Landlord Contact</h4>
                    
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-primary-100 p-2 rounded-lg">
                        <Mail className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{landlord.name}</p>
                        <p className="text-sm text-gray-600">{landlord.email}</p>
                      </div>
                    </div>

                    {landlord.phone && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Phone</p>
                          <a 
                            href={`tel:${landlord.phone}`}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            {landlord.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Schedule Viewing</span>
                    </button>

                    {landlord.phone && (
                      <a
                        href={generateWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>WhatsApp Landlord</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : !user ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Sign in to unlock property details</p>
                  <button
                    onClick={() => navigate('/auth')}
                    className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Only students can unlock properties</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetailPage