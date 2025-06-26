import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Upload, MapPin, DollarSign, Users, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase, calculateReservationFee } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
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

const LandlordDashboard: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    detailed_location: '',
    rooms_available: 1,
    total_rooms: 1,
    price: 0,
    tier: 'mid' as 'low' | 'mid' | 'premium',
    images: [] as string[],
    video_url: ''
  })

  
  const navigate = useNavigate()

   // ...existing code...
  const { user, profile, loading: authLoading, refreshAuth } = useAuth()
  
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/auth')
      return
    }
    if (profile && profile.role !== 'landlord') {
      navigate('/explore')
      return
    }
    if (user && !profile) {
      refreshAuth()
      return
    }
    if (user && profile && profile.role === 'landlord') {
      fetchProperties()
    }
  }, [user, profile, authLoading, navigate, refreshAuth])
  // ...existing code...

  const fetchProperties = async () => {
    if (!user) {
      console.log('❌ No user available for fetching properties')
      return
    }

    try {
      setLoading(true)
      console.log('🏠 Fetching properties for landlord:', user.id)
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching properties:', error)
        throw error
      }

      console.log('✅ Properties fetched successfully:', data?.length || 0, 'items')
      setProperties(data || [])
    } catch (error) {
      console.error('❌ Error fetching properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      // Calculate dynamic reservation fee
      const dynamicReservationFee = calculateReservationFee(formData.price, formData.total_rooms)

      const propertyData = {
        ...formData,
        landlord_id: user.id,
        reservation_fee: dynamicReservationFee,
        images: formData.images.length > 0 ? formData.images : ['https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'],
        video_url: formData.video_url || null
      }

      if (editingProperty) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id)

        if (error) throw error
        toast.success('Property updated successfully!')
      } else {
        const { error } = await supabase
          .from('properties')
          .insert(propertyData)

        if (error) throw error
        toast.success('Property added successfully! It will be reviewed for verification.')
      }

      resetForm()
      fetchProperties()
    } catch (error) {
      console.error('❌ Error saving property:', error)
      toast.error('Failed to save property')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Property deleted successfully!')
      fetchProperties()
    } catch (error) {
      console.error('❌ Error deleting property:', error)
      toast.error('Failed to delete property')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      detailed_location: '',
      rooms_available: 1,
      total_rooms: 1,
      price: 0,
      tier: 'mid',
      images: [],
      video_url: ''
    })
    setShowAddForm(false)
    setEditingProperty(null)
  }

  const startEdit = (property: Property) => {
    setFormData({
      title: property.title,
      description: property.description,
      location: property.location,
      detailed_location: property.detailed_location,
      rooms_available: property.rooms_available,
      total_rooms: property.total_rooms,
      price: property.price,
      tier: property.tier,
      images: property.images,
      video_url: property.video_url || ''
    })
    setEditingProperty(property)
    setShowAddForm(true)
  }


  
    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
  
    const uploadedImageUrls: string[] = []
    let uploadedVideoUrl: string | null = null
  
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) continue
  
      // Sanitize file name: remove spaces and special chars
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const folder = isImage ? 'images' : 'videos'
      const filePath = `${folder}/${Date.now()}-${safeName}`
  
      const { error } = await supabase
        .storage
        .from('property-media')
        .upload(filePath, file, { upsert: false })
  
      if (error) {
        toast.error(`Failed to upload: ${file.name}`)
        continue
      }
  
      const { data } = supabase
        .storage
        .from('property-media')
        .getPublicUrl(filePath)
  
      if (data?.publicUrl) {
        if (isImage) uploadedImageUrls.push(data.publicUrl)
        if (isVideo) uploadedVideoUrl = data.publicUrl
      }
    }
  
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...uploadedImageUrls],
      video_url: uploadedVideoUrl || prev.video_url
    }))
  }

  // Calculate dynamic reservation fee for display
  const dynamicReservationFee = formData.price > 0 && formData.total_rooms > 0 
    ? calculateReservationFee(formData.price, formData.total_rooms)
    : 0

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

  // If not a landlord, this will be handled by the useEffect redirect
  if (profile && profile.role !== 'landlord') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Show loading state while fetching properties
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landlord Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {profile?.name}! Manage your property listings
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Add Property</span>
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <MapPin className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {properties.filter(p => p.is_verified).length}
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
                <p className="text-gray-600 text-sm">Available Spaces</p>
                <p className="text-2xl font-bold text-gray-900">
                  {properties.reduce((sum, p) => sum + p.rooms_available, 0)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg. Session Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{properties.length > 0 ? Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length).toLocaleString() : 0}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Properties List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Your Properties</h2>
          </div>

          {properties.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {properties.map((property) => (
                                // ...inside the properties.map render...
                <div
                  key={property.id}
                  className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <img
                      src={property.images[0] || 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'}
                      alt={property.title}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{property.title}</h3>
                      <p className="text-gray-600 truncate">{property.location}</p>
                      <div className="flex flex-wrap items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">
                          ₦{property.price.toLocaleString()}/session
                        </span>
                        <span className="text-sm text-gray-500">
                          {property.rooms_available}/{property.total_rooms} available
                        </span>
                        <span className="text-sm text-primary-600">
                          Reservation: ₦{calculateReservationFee(property.price, property.total_rooms).toLocaleString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          property.is_verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {property.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 mt-4 sm:mt-0">
                    <button
                      onClick={() => startEdit(property)}
                      className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      aria-label="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <MapPin className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties yet</h3>
              <p className="text-gray-600 mb-6">Start by adding your first property listing</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Add Your First Property
              </button>
            </div>
          )}
        </motion.div>

        {/* Add/Edit Property Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProperty ? 'Edit Property' : 'Add New Property'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Modern 2-Bedroom Apartment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      General Location
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Near LASU, Ojo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Location <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.detailed_location}
                    onChange={(e) => setFormData({ ...formData, detailed_location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Exact address, landmarks, directions - only visible after payment"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This detailed location will only be shown to students after they pay the reservation fee
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Describe your property..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Spaces
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.total_rooms}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        total_rooms: parseInt(e.target.value),
                        rooms_available: Math.min(formData.rooms_available, parseInt(e.target.value))
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Spaces
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={formData.total_rooms}
                      value={formData.rooms_available}
                      onChange={(e) => setFormData({ ...formData, rooms_available: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tier
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as 'low' | 'mid' | 'premium' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="low">Budget</option>
                      <option value="mid">Standard</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Rent (₦) - Total for all spaces
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 180000"
                  />
                  {formData.price > 0 && formData.total_rooms > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Individual space rent:</strong> ₦{(formData.price / formData.total_rooms).toLocaleString()}
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Auto-calculated reservation fee (1%):</strong> ₦{dynamicReservationFee.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Images
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Upload property images</p>
                                        
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      className="hidden"
                      id="media-upload"
                    />
                    <label
                      htmlFor="media-upload"
                      className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors cursor-pointer"
                    >
                      Choose Images/Videos
                    </label>
                  </div>
                                    
                  {formData.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {formData.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Property ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                  {formData.video_url && (
                    <div className="mt-4">
                      <video controls className="w-full h-32 rounded-lg">
                        <source src={formData.video_url} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Tour URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300"
                  >
                    {editingProperty ? 'Update Property' : 'Add Property'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LandlordDashboard