import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import {
  fetchMyCheckins,
  fetchPublicCheckins,
  fetchCheckinById,
  createCheckin,
  updateCheckin,
  deleteCheckin,
  fetchStats,
  computeStats,
  type TravelStats,
} from './checkins'
import type { Checkin, CheckinInput } from './types'

export function useMyCheckins() {
  const { guest } = useAuth()
  return useQuery({
    queryKey: ['my-checkins', guest],
    queryFn: fetchMyCheckins,
  })
}

export function usePublicCheckins(publicId: string) {
  return useQuery({
    queryKey: ['public-checkins', publicId],
    queryFn: () => fetchPublicCheckins(publicId),
    enabled: !!publicId,
  })
}

export function useCheckin(id: number | null) {
  const { guest } = useAuth()
  return useQuery({
    queryKey: ['checkin', id, guest],
    queryFn: () => fetchCheckinById(id as number),
    enabled: id != null,
  })
}

export function useStats(uid: string) {
  const { guest } = useAuth()
  return useQuery({
    queryKey: ['stats', uid, guest],
    queryFn: () => fetchStats(uid),
    enabled: !!uid && !guest,
  })
}

export function useCreateCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CheckinInput) => createCheckin(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-checkins'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useUpdateCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CheckinInput }) =>
      updateCheckin(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-checkins'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useDeleteCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCheckin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-checkins'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export { computeStats }
export type { Checkin, TravelStats }
