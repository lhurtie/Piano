import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authApi } from '../api'

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const token = authApi.getToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
