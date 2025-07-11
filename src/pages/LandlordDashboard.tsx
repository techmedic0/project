import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchProperties, handleDeleteProperty, handleMediaUpload, handleSubmitProperty, resetFormData } from '../utils/landlordDashboardUtils'
import PropertyForm from '../components/PropertyForm'
import PropertyList from '../components/PropertyList'
import StatsGrid from '../components/StatsGrid'
import LandlordVerification from '../components/LandlordVerification'
import MultiStepPropertyForm from '../components/MultiStepPropertyForm'
import { Property } from '../types/global'

const LandlordDashboard: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState(resetFormData())
  const { user, profile, loading: authLoading, refreshAuth } = useAuth()
  const navigate = useNavigate()

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
      fetchProperties(user.id, setProperties, setLoading)
    }
  }, [user, profile, authLoading, navigate, refreshAuth])

  const refreshProperties = () => fetchProperties(user.id, setProperties, setLoading)

  const handleAdd = () => {
    setEditingProperty(null)
    setShowAddForm(true)
  }

  const handleEdit = (property: Property) => {
    setEditingProperty(property)
    setShowAddForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    await handleSubmitProperty({
      e,
      user,
      formData,
      editingProperty,
      setFormData,
      setEditingProperty,
      setShowAddForm,
      setProperties,
      fetchProperties: () => fetchProperties(user.id, setProperties, setLoading),
    })
  }

  const handleDelete = async (id: string) => {
    await handleDeleteProperty({
      id,
      setProperties,
      fetchProperties: () => fetchProperties(user.id, setProperties, setLoading),
    })
  }

  // Show verification before property upload
  if (showAddForm && profile && !profile.is_identity_verified) {
    return (
      <LandlordVerification
        userId={user.id}
        onVerified={() => {
          toast.success('Verification submitted! We will review and notify you soon.')
          setShowAddForm(false)
        }}
      />
    )
  }

  // Show multi-step property form if verified
  if (showAddForm && profile && profile.is_identity_verified) {
    return (
      <MultiStepPropertyForm
        userId={user.id}
        onSuccess={() => {
          toast.success('Property submitted for review!')
          setShowAddForm(false)
        }}
      />
    )
  }

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
        <StatsGrid properties={properties} />

        {/* Properties List */}
        <PropertyList
          properties={properties}
          startEdit={handleEdit}
          handleDelete={handleDelete}
        />

        {showAddForm && (
          <MultiStepPropertyForm
            userId={user.id}
            onSuccess={() => setShowAddForm(false)}
          />
        )}
      </div>
    </div>
  )
}

export default LandlordDashboard