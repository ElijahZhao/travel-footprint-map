export type CategoryKey = 'scenery' | 'food' | 'culture' | 'city' | 'family' | 'outdoor'
export type CheckinStatus = 'visited' | 'wish'

export interface PhotoItem {
  url: string
  thumb?: string
}

export interface Checkin {
  id: number
  user_id: string
  place_name: string
  address: string | null
  lng: number
  lat: number
  category: CategoryKey
  status: CheckinStatus
  visit_date: string | null
  mood_text: string | null
  tags: string[]
  photos: PhotoItem[]
  rating: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CheckinInput {
  place_name: string
  address?: string | null
  lng: number
  lat: number
  category: CategoryKey
  status: CheckinStatus
  visit_date?: string | null
  mood_text?: string | null
  tags?: string[]
  photos?: PhotoItem[]
  rating?: number
  is_public?: boolean
}
