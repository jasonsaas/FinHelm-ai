'use client'

import { SignIn, SignUp, useAuth, useUser } from '@clerk/nextjs'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Users, Shield, Zap } from 'lucide-react'
import Link from 'next/link'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signin')
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isSignedIn && user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome back, {user.firstName || user.username || 'User'}!</CardTitle>
            <CardDescription>You are already signed in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
            <Link href="/integrations">
              <Button variant="outline" className="w-full">Manage Integrations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const benefits = [
    { icon: <Building2 className="h-5 w-5" />, text: "Multi-company support" },
    { icon: <Users className="h-5 w-5" />, text: "Team collaboration tools" },
    { icon: <Shield className="h-5 w-5" />, text: "Bank-grade security" },
    { icon: <Zap className="h-5 w-5" />, text: "Real-time data sync" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
                FinHelm.ai
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="hidden lg:block">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Start Your Financial
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Intelligence Journey
              </span>
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of businesses using FinHelm.ai to gain unprecedented visibility into their financial operations.
            </p>
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    {benefit.icon}
                  </div>
                  <span className="text-gray-700 font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
              <CardContent className="p-6">
                <p className="text-gray-700 italic">
                  "FinHelm.ai transformed how we manage our finances. The AI insights saved us over $250K in the first quarter alone."
                </p>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">Sarah Chen</p>
                  <p className="text-sm text-gray-600">CFO at TechStart Inc.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right side - Auth forms */}
          <div>
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to FinHelm.ai</CardTitle>
                <CardDescription>Sign in to access your financial dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin" className="mt-6">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 text-center">
                        Sign in with your email or social account
                      </p>
                      {/* Clerk SignIn component will be integrated here */}
                      <div className="p-8 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-500">Clerk Sign-In Component</p>
                        <p className="text-sm text-gray-400 mt-2">Configure Clerk to enable authentication</p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="signup" className="mt-6">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 text-center">
                        Create a new account to get started
                      </p>
                      {/* Clerk SignUp component will be integrated here */}
                      <div className="p-8 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-500">Clerk Sign-Up Component</p>
                        <p className="text-sm text-gray-400 mt-2">Configure Clerk to enable registration</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    By signing up, you agree to our{' '}
                    <Link href="#" className="text-blue-600 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mobile benefits - shown only on small screens */}
            <div className="mt-8 space-y-3 lg:hidden">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    {benefit.icon}
                  </div>
                  <span className="text-gray-700 text-sm font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}