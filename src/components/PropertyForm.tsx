import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Property } from '../types/global'

interface PropertyFormProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  handleSubmit: (e: React.FormEvent) => void
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  editingProperty: Property | null
  setShowAddForm: (show: boolean) => void
  resetForm: () => void
}

const PropertyForm: React.FC<PropertyFormProps> = ({
  formData,
  setFormData,
  handleSubmit,
  handleMediaUpload,
  editingProperty,
  setShowAddForm,
  resetForm
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {editingProperty ? 'Edit Property' : 'Add New Property'}
        </h2>
        <button onClick={resetForm} className="text-gray-400 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
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
              Total Rooms
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
              Rooms Available
            </label>
            <input
              type="number"
              required
              min="1"
              max={formData.total_rooms}
              value={formData.rooms_available}
              onChange={(e) => setFormData({ ...formData, rooms_available: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (₦)
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tier
          </label>
          <select
            value={formData.tier}
            onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="mid">Mid</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Images & Video
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaUpload}
            className="w-full"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.images.map((img: string, idx: number) => (
              <img key={idx} src={img} alt="Property" className="w-16 h-16 object-cover rounded" />
            ))}
            {formData.video_url && (
              <video src={formData.video_url} controls className="w-24 h-16 rounded" />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            {editingProperty ? 'Update Property' : 'Add Property'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
)

export default PropertyForm