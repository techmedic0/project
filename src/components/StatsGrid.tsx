import React from 'react'
import { MapPin, Eye, Users, DollarSign } from 'lucide-react'
import { Property } from '../types/global'
import { calculateReservationFee } from '../utils/supabase'

interface StatsGridProps {
  properties: Property[]
}

const StatsGrid: React.FC<StatsGridProps> = ({ properties }) => (
  <div
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
  </div>
)

export default StatsGrid