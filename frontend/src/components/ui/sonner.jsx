import { Toaster as SonnerToaster, toast } from 'sonner'
import React from 'react'

export const Toaster = (props) => {
  return <SonnerToaster {...props} />
}

export { toast }
