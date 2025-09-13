'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  Circle, 
  RefreshCw, 
  Settings, 
  AlertCircle, 
  ExternalLink,
  Database,
  Link2,
  Zap,
  Calendar,
  FileText,
  Building,
  CreditCard,
  Users,
  Package
} from 'lucide-react'
import Link from 'next/link'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'connected' | 'disconnected' | 'pending'
  category: 'accounting' | 'banking' | 'crm' | 'erp' | 'other'
  lastSync?: string
  features: string[]
}

export default function IntegrationsPage() {
  const [syncing, setSyncing] = useState<string | null>(null)

  const integrations: Integration[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks Online',
      description: 'Sync invoices, bills, and financial data in real-time',
      icon: <FileText className="h-6 w-6" />,
      status: 'connected',
      category: 'accounting',
      lastSync: '2 hours ago',
      features: ['Invoices', 'Bills', 'Payments', 'Customers', 'Vendors']
    },
    {
      id: 'sage-intacct',
      name: 'Sage Intacct',
      description: 'Enterprise-grade financial management and reporting',
      icon: <Building className="h-6 w-6" />,
      status: 'disconnected',
      category: 'erp',
      features: ['GL Accounts', 'Dimensions', 'Projects', 'Consolidation']
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing and subscription management',
      icon: <CreditCard className="h-6 w-6" />,
      status: 'disconnected',
      category: 'banking',
      features: ['Payments', 'Subscriptions', 'Invoices', 'Payouts']
    },
    {
      id: 'plaid',
      name: 'Plaid',
      description: 'Bank account connections and transaction data',
      icon: <Database className="h-6 w-6" />,
      status: 'disconnected',
      category: 'banking',
      features: ['Bank Accounts', 'Transactions', 'Balances', 'Identity']
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Customer relationship management and sales data',
      icon: <Users className="h-6 w-6" />,
      status: 'disconnected',
      category: 'crm',
      features: ['Opportunities', 'Accounts', 'Contacts', 'Quotes']
    },
    {
      id: 'netsuite',
      name: 'NetSuite',
      description: 'Cloud-based business management suite',
      icon: <Package className="h-6 w-6" />,
      status: 'disconnected',
      category: 'erp',
      features: ['Financials', 'Inventory', 'Orders', 'CRM']
    }
  ]

  const handleConnect = async (integrationId: string) => {
    if (integrationId === 'quickbooks') {
      // QuickBooks OAuth flow
      try {
        const response = await fetch('https://ardent-dog-632.convex.cloud/api/mutation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'quickbooks/oauth:generateAuthUrl',
            args: {}
          })
        })
        
        const data = await response.json()
        if (data.value?.authUrl) {
          window.open(data.value.authUrl, '_blank', 'width=700,height=600')
        }
      } catch (error) {
        console.error('Failed to connect:', error)
      }
    } else {
      // Placeholder for other integrations
      alert(`${integrationId} integration coming soon!`)
    }
  }

  const handleSync = async (integrationId: string) => {
    setSyncing(integrationId)
    // Simulate sync
    setTimeout(() => {
      setSyncing(null)
    }, 2000)
  }

  const categories = [
    { id: 'all', name: 'All Integrations', count: integrations.length },
    { id: 'accounting', name: 'Accounting', count: integrations.filter(i => i.category === 'accounting').length },
    { id: 'banking', name: 'Banking', count: integrations.filter(i => i.category === 'banking').length },
    { id: 'crm', name: 'CRM', count: integrations.filter(i => i.category === 'crm').length },
    { id: 'erp', name: 'ERP', count: integrations.filter(i => i.category === 'erp').length }
  ]

  const [selectedCategory, setSelectedCategory] = useState('all')
  const filteredIntegrations = selectedCategory === 'all' 
    ? integrations 
    : integrations.filter(i => i.category === selectedCategory)

  const connectedCount = integrations.filter(i => i.status === 'connected').length

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
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/auth">
                <Button>Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
          <p className="text-lg text-gray-600">
            Connect your financial tools to unlock powerful insights and automation
          </p>
        </div>

        {/* Status Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>{connectedCount} of {integrations.length}</strong> integrations connected. 
            Connect more tools to enhance your financial visibility.
          </AlertDescription>
        </Alert>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="whitespace-nowrap"
            >
              {cat.name}
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
                {cat.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className={`hover:shadow-lg transition-shadow ${
              integration.status === 'connected' ? 'border-green-200' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      integration.status === 'connected' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {integration.status === 'connected' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-xs font-medium ${
                          integration.status === 'connected' 
                            ? 'text-green-600' 
                            : 'text-gray-500'
                        }`}>
                          {integration.status === 'connected' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {integration.description}
                </CardDescription>
                
                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {integration.features.map((feature, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Last Sync */}
                {integration.status === 'connected' && integration.lastSync && (
                  <p className="text-xs text-gray-500 mb-4">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Last synced {integration.lastSync}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {integration.status === 'connected' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSync(integration.id)}
                        disabled={syncing === integration.id}
                      >
                        {syncing === integration.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync Now
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConnect(integration.id)}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Section */}
        <Card className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Build Custom Integrations with our API
            </CardTitle>
            <CardDescription>
              Use our powerful REST API and webhooks to connect any data source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="font-semibold text-gray-900 mb-1">RESTful API</p>
                <p className="text-sm text-gray-600">Full CRUD operations on all resources</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Webhooks</p>
                <p className="text-sm text-gray-600">Real-time event notifications</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">SDKs</p>
                <p className="text-sm text-gray-600">JavaScript, Python, Ruby, and more</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button>
                View API Docs
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline">
                Get API Keys
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}