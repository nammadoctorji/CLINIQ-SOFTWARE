import { create } from 'zustand'

export const useAuth = create((set) => ({
  user: null,           // { uid, name, role, tenantId, tenantName }
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}))
