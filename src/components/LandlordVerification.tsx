import React, { useState } from 'react'
import { supabase } from '../utils/supabase'
import toast from 'react-hot-toast'

interface Props {
  userId: string
  onVerified: () => void
}

const LandlordVerification: React.FC<Props> = ({ userId, onVerified }) => {
  const [idFile, setIdFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setIdFile(e.target.files[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idFile || !consent) {
      toast.error('Please upload your ID and give consent.')
      return
    }
    setLoading(true)
    try {
      // Upload ID to Supabase Storage
      const filePath = `ids/${userId}-${Date.now()}-${idFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
      const { error } = await supabase.storage
        .from('landlord-ids')
        .upload(filePath, idFile)
      if (error) throw error

      const { data } = supabase.storage.from('landlord-ids').getPublicUrl(filePath)
      if (!data?.publicUrl) throw new Error('Could not get public URL')

      // Save URL to user profile (identity_document_url)
      const { error: updateError } = await supabase
        .from('users')
        .update({ identity_document_url: data.publicUrl })
        .eq('id', userId)
      if (updateError) throw updateError

      toast.success('ID uploaded! We will verify you soon.')
      onVerified()
    } catch (err) {
      toast.error('Failed to upload ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-2 text-center text-primary-700">Verify Your Identity</h2>
        <p className="text-gray-600 mb-4 text-center">
          To build trust and increase your property’s visibility, please verify your identity.<br />
          <span className="text-primary-600 font-semibold">Students trust verified landlords more!</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-medium">Upload Government-issued ID</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleIdUpload}
              className="block w-full mt-2"
              required
            />
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              required
            />
            <span className="text-sm">
              I consent to my ID being used for verification and trust-building on Havenix.
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition"
          >
            {loading ? 'Uploading...' : 'Submit for Verification'}
          </button>
        </form>
      </div>
      
    </div>
  )
}

export default LandlordVerification