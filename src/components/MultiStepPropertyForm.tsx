import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import toast from 'react-hot-toast'
import { Property } from '../types/global'

const steps = [
  'Basic Info', 'Address', 'Features', 'Media', 'Proof', 'Review'
]

const initialForm = {
  title: '', description: '', location: '', detailed_location: '',
  total_rooms: 1, rooms_available: 1, price: '', tier: 'mid',
  images: [], video: null, proof: null
}

interface MultiStepPropertyFormProps {
  userId: string
  onSuccess: () => void
  onCancel: () => void
  refreshProperties: () => void
  propertyToEdit?: Property | null
}

const MultiStepPropertyForm: React.FC<MultiStepPropertyFormProps> = (props) => {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<any>(initialForm)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const isEdit = !!props.propertyToEdit

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1))
  const handleBack = () => setStep(s => Math.max(s - 1, 0))

  // Pre-fill form for edit
  useEffect(() => {
    if (props.propertyToEdit) {
      setForm({
        title: props.propertyToEdit.title,
        description: props.propertyToEdit.description,
        location: props.propertyToEdit.location,
        detailed_location: props.propertyToEdit.detailed_location,
        total_rooms: props.propertyToEdit.total_rooms,
        rooms_available: props.propertyToEdit.rooms_available,
        price: props.propertyToEdit.price,
        tier: props.propertyToEdit.tier,
        images: props.propertyToEdit.images || [],
        video: props.propertyToEdit.video_url ? props.propertyToEdit.video_url : null,
        proof: null // Can't prefill file input, but you can show a link to the existing proof if needed
      })
    } else {
      setForm(initialForm)
    }
  }, [props.propertyToEdit])

  // File upload helpers
  const uploadFile = async (bucket: string, file: File, prefix: string) => {
    const filePath = `${prefix}/${props.userId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data?.publicUrl
  }

  // Reservation fee calculation (1% of individual space rent)
  const calcReservationFee = () => {
    const price = Number(form.price)
    const total = Number(form.total_rooms)
    if (!price || !total) return 0
    const individual = price / total
    return Math.round(individual * 0.01)
  }

  // Main submit handler
  const handleSubmit = async () => {
    setLoading(true)
    setUploading(true)
    try {
      // 1. Upload images if new files are selected
      let imageUrls: string[] = []
      if (form.images && form.images.length > 0) {
        for (const img of form.images) {
          if (typeof img === 'string') {
            imageUrls.push(img) // already uploaded
          } else {
            const url = await uploadFile('property-media', img, 'images')
            imageUrls.push(url)
          }
        }
      }

      // 2. Upload video if new file is selected
      let videoUrl: string | null = null
      if (form.video) {
        if (typeof form.video === 'string') {
          videoUrl = form.video // already uploaded
        } else {
          videoUrl = await uploadFile('property-media', form.video, 'videos')
        }
      }

      // 3. Upload proof of ownership if new file is selected
      let proofUrl: string | null = null
      if (form.proof) {
        if (typeof form.proof === 'string') {
          proofUrl = form.proof // already uploaded
        } else {
          proofUrl = await uploadFile('property-proofs', form.proof, 'proofs')
        }
      } else if (isEdit && props.propertyToEdit?.proof_of_ownership) {
        proofUrl = props.propertyToEdit.proof_of_ownership
      }

      setUploading(false)

      // 4. Insert or update property in DB
      let error
      if (isEdit && props.propertyToEdit) {
        // Update
        ({ error } = await supabase.from('properties').update({
          title: form.title,
          description: form.description,
          location: form.location,
          detailed_location: form.detailed_location,
          total_rooms: Number(form.total_rooms),
          rooms_available: Number(form.rooms_available),
          price: Number(form.price),
          tier: form.tier,
          reservation_fee: calcReservationFee(),
          images: imageUrls,
          video_url: videoUrl,
          proof_of_ownership: proofUrl,
          pending_review: true,
        }).eq('id', props.propertyToEdit.id))
      } else {
        // Insert
        ({ error } = await supabase.from('properties').insert({
          landlord_id: props.userId,
          title: form.title,
          description: form.description,
          location: form.location,
          detailed_location: form.detailed_location,
          total_rooms: Number(form.total_rooms),
          rooms_available: Number(form.rooms_available),
          price: Number(form.price),
          tier: form.tier,
          reservation_fee: calcReservationFee(),
          is_verified: false,
          images: imageUrls,
          video_url: videoUrl,
          proof_of_ownership: proofUrl,
          pending_review: true,
          created_at: new Date().toISOString()
        }))
      }
      if (error) throw error

      toast.success(isEdit ? 'Property updated!' : 'Property submitted for review!')
      props.refreshProperties()
      props.onSuccess()
    } catch (err: any) {
      toast.error('Failed to submit property: ' + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  // Step validation
  const canProceed = () => {
    switch (step) {
      case 0: return form.title && form.description
      case 1: return form.location && form.detailed_location
      case 2: return form.total_rooms && form.rooms_available && form.price && form.tier
      case 3: return form.images.length > 0
      case 4: return isEdit ? true : form.proof // allow skipping proof on edit if already exists
      default: return true
    }
  }

  // UI
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-2">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-4 relative animate-fade-in">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((label, idx) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                ${idx === step ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}
              `}>
                {idx + 1}
              </div>
              <span className={`text-[11px] mt-1 ${idx === step ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-4">
          {step === 0 && (
            <div className="space-y-4">
              <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-400" placeholder="Property Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-400" placeholder="Short Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-400" placeholder="General Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <textarea className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-400" placeholder="Detailed Location (landmarks, directions, etc.)" value={form.detailed_location} onChange={e => setForm({ ...form, detailed_location: e.target.value })} rows={3} />
              <p className="text-xs text-gray-500 mt-1">This will only be shown to students after payment.</p>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Rooms</label>
                  <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-400" type="number" min={1} value={form.total_rooms} onChange={e => setForm({ ...form, total_rooms: e.target.value, rooms_available: Math.min(form.rooms_available, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rooms Available</label>
                  <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-400" type="number" min={1} max={form.total_rooms} value={form.rooms_available} onChange={e => setForm({ ...form, rooms_available: e.target.value })} />
                </div>
              </div>
              <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-400" type="number" min={1} placeholder="Total Price (₦)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              <select className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-400" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}>
                <option value="low">Budget</option>
                <option value="mid">Standard</option>
                <option value="premium">Premium</option>
              </select>
              <div className="text-xs text-primary-600 mt-1">
                Reservation fee (1% of individual space rent): <b>₦{calcReservationFee().toLocaleString()}</b>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photos</label>
              <input className="w-full" type="file" accept="image/*" multiple onChange={e => setForm({ ...form, images: Array.from(e.target.files || []) })} />
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {form.images && Array.isArray(form.images) && form.images.map((img: any, idx: number) => (
                  <img key={idx} src={typeof img === 'string' ? img : URL.createObjectURL(img)} alt="preview" className="w-16 h-16 object-cover rounded-lg border" />
                ))}
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video (optional)</label>
              <input className="w-full" type="file" accept="video/*" onChange={e => setForm({ ...form, video: e.target.files?.[0] })} />
              {form.video && typeof form.video !== 'string' && (
                <video src={URL.createObjectURL(form.video)} controls className="w-full rounded-lg mt-2 max-h-40" />
              )}
              {form.video && typeof form.video === 'string' && (
                <video src={form.video} controls className="w-full rounded-lg mt-2 max-h-40" />
              )}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Ownership</label>
              <input className="w-full" type="file" accept="image/*,application/pdf" onChange={e => setForm({ ...form, proof: e.target.files?.[0] })} />
              {isEdit && props.propertyToEdit?.proof_of_ownership && !form.proof && (
                <div className="mt-2">
                  <a href={props.propertyToEdit.proof_of_ownership} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 underline">View current proof of ownership</a>
                </div>
              )}
              {form.proof && (
                <div className="mt-2">
                  {form.proof.type && form.proof.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(form.proof)} alt="proof" className="w-20 h-20 object-cover rounded-lg border" />
                  ) : (
                    <span className="text-xs text-gray-500">{form.proof.name}</span>
                  )}
                </div>
              )}
            </div>
          )}
          {step === 5 && (
            <div className="space-y-2">
              <div className="font-semibold text-primary-700">Review Your Details:</div>
              <div className="bg-gray-50 rounded p-2 text-xs text-gray-700">
                <div><b>Title:</b> {form.title}</div>
                <div><b>Description:</b> {form.description}</div>
                <div><b>Location:</b> {form.location}</div>
                <div><b>Detailed Location:</b> {form.detailed_location}</div>
                <div><b>Total Rooms:</b> {form.total_rooms}</div>
                <div><b>Rooms Available:</b> {form.rooms_available}</div>
                <div><b>Price:</b> ₦{form.price}</div>
                <div><b>Tier:</b> {form.tier}</div>
                <div><b>Images:</b> {form.images.length} file(s)</div>
                <div><b>Video:</b> {form.video ? (typeof form.video === 'string' ? 'Current Video' : form.video.name) : 'None'}</div>
                <div><b>Proof:</b> {form.proof ? (form.proof.name || 'Selected') : (isEdit && props.propertyToEdit?.proof_of_ownership ? 'Current Proof' : 'None')}</div>
                <div><b>Reservation Fee:</b> ₦{calcReservationFee().toLocaleString()}</div>
              </div>
              <div className="text-xs text-gray-400 mt-2">Please confirm all details before submitting. Your property will be reviewed before going live.</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={props.onCancel}
            className="text-gray-500 font-semibold px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            disabled={loading || uploading}
          >
            Cancel
          </button>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="text-primary-500 font-semibold px-4 py-2 rounded-lg bg-primary-50 hover:bg-primary-100 transition"
              disabled={loading || uploading}
            >
              Back
            </button>
          )}
          {step < steps.length - 1 && (
            <button
              onClick={handleNext}
              className={`ml-auto bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-2 rounded-lg font-semibold shadow hover:from-primary-600 hover:to-secondary-600 transition ${!canProceed() ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canProceed() || loading || uploading}
            >
              Next
            </button>
          )}
          {step === steps.length - 1 && (
            <button
              onClick={handleSubmit}
              disabled={loading || uploading}
              className="ml-auto bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-2 rounded-lg font-semibold shadow hover:from-primary-600 hover:to-secondary-600 transition"
            >
              {loading || uploading ? (isEdit ? 'Updating...' : 'Submitting...') : (isEdit ? 'Update Property' : 'Submit Property')}
            </button>
          )}
        </div>
        {(loading || uploading) && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex flex-col items-center justify-center rounded-2xl z-10">
            <div className="loader mb-2"></div>
            <span className="text-primary-600 font-semibold">{isEdit ? 'Updating property...' : 'Uploading files & saving property...'}</span>
          </div>
        )}
      </div>
      <style>{`
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  )
}

export default MultiStepPropertyForm