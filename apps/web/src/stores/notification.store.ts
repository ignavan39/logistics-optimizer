import { useState, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  timestamp: number
  read: boolean
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      read: false,
    }
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  removeNotification: (id) => {
    const notification = get().notifications.find((n) => n.id === id)
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: notification && !notification.read
        ? state.unreadCount - 1
        : state.unreadCount,
    }))
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },
}))

export function useNotifications() {
  const store = useNotificationStore()

  useEffect(() => {
    const socket = initSocket()
    if (!socket) return

    const handleOrderEvent = (data: { orderId: string; status?: string }) => {
      store.addNotification({
        type: 'info',
        title: 'Заказ обновлён',
        message: `Статус заказа ${data.orderId.slice(0, 8)}: ${data.status}`,
      })
    }

    socket.on('order:statusChanged', handleOrderEvent)
    socket.on('order:assigned', (data: { orderId: string; vehicleId: string }) => {
      store.addNotification({
        type: 'success',
        title: 'Заказ назначен',
        message: `Заказ ${data.orderId.slice(0, 8)} назнален транспорту`,
      })
    })

    return () => {
      socket.off('order:statusChanged', handleOrderEvent)
    }
  }, [])

  return store
}