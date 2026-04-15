import { createContext, useContext } from 'react'

export const DeviceContext = createContext(null)
export function useDevice() {
  return useContext(DeviceContext)
}
