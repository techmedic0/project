import React, { useState, useEffect } from 'react'
import { Search, Filter, MapPin, SlidersHorizontal, X, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, testConnection } from '../utils/supabase'
import PropertyCard from '../components/PropertyCard'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

interface Property {
  id: string
  title: string
  description: string
  location: string
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

const ExplorePage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedTier, setSelectedTier] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [unlockedProperties, setUnlockedProperties] = useState<Set<string>>(new Set())
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing')
  const { user, loading: authLoading } = useAuth()

  const locations = ['LASU', 'UNILAG', 'OAU', 'UI', 'Covenant University', 'FUTA', 'UNIBEN']
  const tiers = [
    { value: 'low', label: 'Budget (₦50k - ₦150k)' },
    { value: 'mid', label: 'Standard (₦150k - ₦300k)' },
    { value: 'premium', label: 'Premium (₦300k+)' }
  ]

  useEffect(() => {
    if (authLoading) return
      initializePage()
  }, [user, authLoading])

  const initializePage = async () => {
    try {
      console.log('🚀 Initializing ExplorePage...')
      
      // Test connection first
      const isConnected = await testConnection()
      if (!isConnected) {
        setConnectionStatus('failed')
        setError('Failed to connect to database. Please check your internet connection.')
        setLoading(false)
        return
      }
      
      setConnectionStatus('connected')
      
      // Fetch properties
      await fetchProperties()
      
      // Fetch unlocked properties if user is logged in
      if (user) {
        await fetchUnlockedProperties()
      }
    } catch (error) {
      console.error('❌ Error initializing page:', error)
      setError('Failed to initialize page. Please refresh and try again.')
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      console.log('🏠 Fetching properties...')
      setError(null)
      
      // First, let's try to fetch ALL properties to see if there's any data
      const { data: allData, error: allError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 All properties query result:', { 
        data: allData, 
        error: allError,
        count: allData?.length || 0 
      })

      if (allError) {
        console.error('❌ Error fetching all properties:', allError)
        throw allError
      }

      // If no properties exist at all, show a different message
      if (!allData || allData.length === 0) {
        console.log('📭 No properties found in database')
        setProperties([])
        setError('No properties available yet. Be the first to list a property!')
        setLoading(false)
        return
      }

      // Now fetch only verified properties for display
      const { data: verifiedData, error: verifiedError } = await supabase
        .from('properties')
        .select('*')
        .eq('is_verified', true)
        .gt('rooms_available', 0)
        .order('created_at', { ascending: false })

      if (verifiedError) {
        console.error('❌ Error fetching verified properties:', verifiedError)
        throw verifiedError
      }

      console.log('✅ Verified properties fetched:', verifiedData?.length || 0)
      
      if (!verifiedData || verifiedData.length === 0) {
        setProperties([])
        setError(`Found ${allData.length} properties in database, but none are verified yet. Properties are being reviewed for verification.`)
      } else {
        setProperties(verifiedData)
        setError(null)
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching properties:', error)
      setError(`Failed to load properties: ${error.message}`)
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnlockedProperties = async () => {
    if (!user) return

    try {
      console.log('🔓 Fetching unlocked properties for user:', user.id)
      
      const { data, error } = await supabase
        .from('reservations')
        .select('property_id')
        .eq('student_id', user.id)
        .eq('unlock_granted', true)

      if (error) {
        console.error('❌ Error fetching unlocked properties:', error)
        return
      }
      
      const unlockedIds = new Set(data?.map(r => r.property_id) || [])
      console.log('✅ Unlocked properties:', unlockedIds.size)
      setUnlockedProperties(unlockedIds)
    } catch (error) {
      console.error('❌ Error fetching unlocked properties:', error)
    }
  }

  const createSampleProperty = async () => {
    if (!user) {
      toast.error('Please sign in to create a sample property')
      return
    }

    try {
      console.log('🏗️ Creating sample property...')
      
      const sampleProperty = {
        title: 'Modern 2-Bedroom Apartment Near LASU',
        description: 'Beautiful and spacious 2-bedroom apartment with modern amenities, located just 5 minutes walk from LASU main gate. Features include 24/7 electricity, running water, security, and parking space.',
        location: 'Near LASU, Ojo',
        detailed_location: 'No. 15 University Road, Opposite LASU Main Gate, Ojo, Lagos State. Landmark: Blue building next to First Bank.',
        rooms_available: 3,
        total_rooms: 4,
        price: 180000,
        tier: 'mid' as const,
        reservation_fee: 5000,
        is_verified: true,
        images: [
          'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
          'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'
        ],
        video_url: null,
        landlord_id: user.id
      }

      const { data, error } = await supabase
        .from('properties')
        .insert(sampleProperty)
        .select()

      if (error) {
        console.error('❌ Error creating sample property:', error)
        throw error
      }

      console.log('✅ Sample property created:', data)
      toast.success('Sample property created successfully!')
      await fetchProperties()
    } catch (error: any) {
      console.error('❌ Error creating sample property:', error)
      toast.error(`Failed to create sample property: ${error.message}`)
    }
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = !selectedLocation || property.location.includes(selectedLocation)
    const matchesTier = !selectedTier || property.tier === selectedTier
    const matchesPrice = (!priceRange.min || property.price >= parseInt(priceRange.min)) &&
                        (!priceRange.max || property.price <= parseInt(priceRange.max))
    
    return matchesSearch && matchesLocation && matchesTier && matchesPrice
  })

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedLocation('')
    setSelectedTier('')
    setPriceRange({ min: '', max: '' })
    setShowFilters(false)
  }

  const activeFiltersCount = [selectedLocation, selectedTier, priceRange.min, priceRange.max].filter(Boolean).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {connectionStatus === 'testing' ? 'Testing connection...' : 'Loading properties...'}
          </p>
        </div>
      </div>
    )
  }

  if (connectionStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true)
              setConnectionStatus('testing')
              initializePage()
            }}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry Connection
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
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Explore Student Housing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover verified, safe, and affordable housing options near your university
          </p>
        </motion.div>

        {/* Connection Status */}
        {connectionStatus === 'connected' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <p className="text-green-700 text-sm text-center">
              ✅ Connected to database successfully
            </p>
          </div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by property name, location, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors relative"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <div className="grid md:grid-cols-4 gap-4">
                  {/* Location Filter */}
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">All Locations</option>
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tier Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">All Tiers</option>
                      {tiers.map(tier => (
                        <option key={tier.value} value={tier.value}>{tier.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min Price"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max Price"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Clear Filters */}
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center justify-center space-x-2 bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6 flex items-center justify-between"
        >
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredProperties.length}</span> {filteredProperties.length === 1 ? 'property' : 'properties'}
            {searchTerm && ` for "${searchTerm}"`}
          </p>
          
          {filteredProperties.length > 0 && (
            <div className="text-sm text-gray-500">
              {unlockedProperties.size > 0 && `${unlockedProperties.size} unlocked`}
            </div>
          )}
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">Notice</p>
                <p className="text-yellow-700 text-sm mt-1">{error}</p>
                {user && (
                  <button
                    onClick={createSampleProperty}
                    className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors"
                  >
                    Create Sample Property
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProperties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <PropertyCard
                  property={property}
                  isUnlocked={unlockedProperties.has(property.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : !error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center py-16"
          >
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No properties found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or check back later for new listings
            </p>
            <button
              onClick={clearAllFilters}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Clear All Filters
            </button>
          </motion.div>
        ) : null}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
            <h4 className="font-semibold mb-2">Debug Info:</h4>
            <p>Connection Status: {connectionStatus}</p>
            <p>Total Properties: {properties.length}</p>
            <p>Filtered Properties: {filteredProperties.length}</p>
            <p>User: {user ? user.email : 'Not logged in'}</p>
            <p>Unlocked Properties: {unlockedProperties.size}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExplorePage