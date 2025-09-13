'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ClerkProvider } from '@clerk/nextjs'
import { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || 'https://ardent-dog-632.convex.cloud'
)

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: 
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
        }
      }}
    >
      <ConvexProvider client={convex}>
        {children}
        <Toaster />
      </ConvexProvider>
    </ClerkProvider>
  )
}