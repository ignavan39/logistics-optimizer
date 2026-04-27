import { useToastStore } from './toast'

export function useToast() {
  const addToast = useToastStore((s) => s.addToast)
  
  return {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    info: (message: string) => addToast('info', message),
  }
}