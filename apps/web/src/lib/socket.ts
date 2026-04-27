import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from './auth'

let socket: Socket | null = null

export function initSocket() {
  const { token } = useAuthStore.getState()
  if (!token) return null
  
  if (socket?.connected) {
    return socket
  }

  socket = io('/notifications', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connected', (data) => {
    console.log('Socket connected:', data)
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected')
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function subscribeToOrder(orderId: string) {
  if (socket?.connected) {
    socket.emit('subscribe:order', orderId)
  }
}

export function unsubscribeFromOrder(orderId: string) {
  if (socket?.connected) {
    socket.emit('unsubscribe:order', orderId)
  }
}