import React from 'react'
import { motion } from 'framer-motion'
import { Edit, Trash2, MapPin } from 'lucide-react'
import { Property } from '../types/global'
import { calculateReservationFee } from '../utils/supabase'

interface PropertyListProps {
  properties: Property[]
  startEdit: (property: Property) => void
  handleDelete: (id: string) => void
}

const PropertyList: React.FC<PropertyListProps> = ({ properties, startEdit, handleDelete }) => (
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
        {/* The add button should be handled in the parent */}
      </div>
    )}
  </motion.div>
)

export default PropertyList