import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Users, Lock, CheckCircle, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { calculateReservationFee } from '../utils/supabase'

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

interface PropertyCardProps {
  property: Property
  isUnlocked?: boolean
  showUnlockPrompt?: boolean
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  isUnlocked = false, 
  showUnlockPrompt = true 
}) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-gradient-to-r from-yellow-400 to-orange-500'
      case 'mid': return 'bg-gradient-to-r from-blue-400 to-purple-500'
      default: return 'bg-gradient-to-r from-green-400 to-blue-500'
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'premium': return 'Premium'
      case 'mid': return 'Standard'
      default: return 'Budget'
    }
  }

  const getUrgencyColor = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage <= 20) return 'text-red-600 bg-red-50'
    if (percentage <= 50) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  // Calculate dynamic reservation fee
  const dynamicReservationFee = calculateReservationFee(property.price, property.total_rooms)

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 group"
    >
      <div className="relative overflow-hidden">
        <motion.img
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.6 }}
          src={property.images[0] || 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'}
          alt={property.title}
          className="w-full h-48 object-cover"
        />
        
        {/* Tier Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-white text-xs font-semibold ${getTierColor(property.tier)} shadow-lg`}>
          {getTierLabel(property.tier)}
        </div>

        {/* Verification Badge */}
        {property.is_verified && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full shadow-lg"
          >
            <CheckCircle className="w-4 h-4" />
          </motion.div>
        )}

        {/* Availability Indicator with Urgency */}
        <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-lg text-xs font-semibold ${getUrgencyColor(property.rooms_available, property.total_rooms)} backdrop-blur-sm`}>
          {property.rooms_available} / {property.total_rooms} left
          {property.rooms_available <= 2 && property.rooms_available > 0 && (
            <span className="ml-1 animate-pulse">🔥</span>
          )}
        </div>

        {/* Unlocked Indicator */}
        {isUnlocked && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>Unlocked</span>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {property.title}
        </h3>
        
        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1 text-primary-500" />
          <span className="text-sm font-medium">{property.location}</span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
          {property.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              ₦{property.price.toLocaleString()}
            </span>
            <span className="text-gray-500 text-sm">/session</span>
          </div>
          
          <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
            <Users className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{property.rooms_available} spaces</span>
          </div>
        </div>

        {!isUnlocked && showUnlockPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-3 mb-4"
          >
            <div className="flex items-center text-primary-700 mb-1">
              <Lock className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold">
                Unlock for ₦{dynamicReservationFee.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-primary-600">
              Get landlord contact, exact location & book viewing
            </p>
            <p className="text-xs text-primary-500 mt-1">
              Fee: 1% of individual space rent (₦{(property.price / property.total_rooms).toLocaleString()} × 0.01)
            </p>
          </motion.div>
        )}

        <Link
          to={`/property/${property.id}`}
          className="block w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-center py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          {isUnlocked ? 'View Full Details' : 'View & Unlock'}
        </Link>
      </div>
    </motion.div>
  )
}

export default PropertyCard