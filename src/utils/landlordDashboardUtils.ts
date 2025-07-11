import toast from 'react-hot-toast'
import { supabase, calculateReservationFee } from './supabase'
import { Property } from '../types/global'

export const fetchProperties = async (
  landlordId: string,
  setProperties: (props: Property[]) => void,
  setLoading: (loading: boolean) => void
) => {
  try {
    setLoading(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false })

    if (error) throw error
    setProperties(data || [])
  } catch (error) {
    toast.error('Failed to load properties')
  } finally {
    setLoading(false)
  }
}

export const handleSubmitProperty = async ({
  e,
  user,
  formData,
  editingProperty,
  setFormData,
  setEditingProperty,
  setShowAddForm,
  setProperties,
  fetchProperties
}: any) => {
  e.preventDefault()
  if (!user) return

  try {
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

    setFormData(resetFormData())
    setShowAddForm(false)
    setEditingProperty(null)
    fetchProperties()
  } catch (error) {
    toast.error('Failed to save property')
  }
}

export const handleDeleteProperty = async ({
  id,
  setProperties,
  fetchProperties
}: any) => {
  if (!window.confirm('Are you sure you want to delete this property?')) return
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
    if (error) throw error
    toast.success('Property deleted successfully!')
    fetchProperties()
  } catch (error) {
    toast.error('Failed to delete property')
  }
}

export const handleMediaUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  setFormData: React.Dispatch<React.SetStateAction<any>>
) => {
  const files = e.target.files
  if (!files) return

  const uploadedImageUrls: string[] = []
  let uploadedVideoUrl: string | null = null

  for (const file of Array.from(files)) {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) continue

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

  setFormData((prev: any) => ({
    ...prev,
    images: [...prev.images, ...uploadedImageUrls],
    video_url: uploadedVideoUrl || prev.video_url
  }))
}

export const resetFormData = () => ({
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