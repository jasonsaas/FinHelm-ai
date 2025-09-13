'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { 
  HelpCircle, 
  Book, 
  Video, 
  MessageSquare, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Zap,
  Database,
  AlertTriangle,
  CheckCircle,
  Users,
  Settings,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  Play,
  FileText,
  Lightbulb,
  Wrench,
  Shield,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Calculator,
  Target,
  Package
} from 'lucide-react';

// Since we can't export metadata from client components, we'll handle SEO differently
const pageTitle = 'Support Center - FinHelm.ai | QuickBooks Help & AI Agent Guide';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  helpTopics: string[];
}

export default function SupportCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // AI Agents data
  const aiAgents: AIAgent[] = [
    {
      id: 'variance-analysis',
      name: 'Variance Analysis Agent',
      description: 'Explains revenue and cost differences with detailed breakdowns',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'Financial Intelligence',
      helpTopics: [
        'How to interpret variance explanations',
        'Understanding rate vs. volume analysis',
        'Setting up variance alert thresholds',
        'Customizing variance reporting periods'
      ]
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Intelligence',
      description: 'Optimizes working capital and predicts cash flow patterns',
      icon: <DollarSign className="w-5 h-5" />,
      category: 'Financial Intelligence',
      helpTopics: [
        'Reading cash flow forecasts',
        'Setting up cash flow alerts',
        'Understanding working capital metrics',
        'Configuring payment term analysis'
      ]
    },
    {
      id: 'anomaly-detection',
      name: 'Anomaly Detection Agent',
      description: 'Monitors transactions for unusual patterns and potential issues',
      icon: <AlertTriangle className="w-5 h-5" />,
      category: 'Financial Intelligence',
      helpTopics: [
        'Understanding anomaly scores',
        'Configuring detection sensitivity',
        'Managing false positive alerts',
        'Setting up notification preferences'
      ]
    },
    {
      id: 'forecasting',
      name: 'AI Forecasting Agent',
      description: 'Generates 13-week and quarterly financial predictions',
      icon: <BarChart3 className="w-5 h-5" />,
      category: 'Financial Intelligence',
      helpTopics: [
        'Interpreting forecast accuracy metrics',
        'Adjusting forecast parameters',
        'Understanding confidence intervals',
        'Incorporating seasonal adjustments'
      ]
    },
    {
      id: 'inventory-optimization',
      name: 'Inventory Optimization',
      description: 'Manages stock levels and prevents overstock/understock',
      icon: <Package className="w-5 h-5" />,
      category: 'Supply Chain',
      helpTopics: [
        'Setting optimal stock levels',
        'Understanding reorder point calculations',
        'Managing seasonal inventory fluctuations',
        'Analyzing carrying cost impacts'
      ]
    },
    {
      id: 'churn-prediction',
      name: 'Customer Churn Prediction',
      description: 'Identifies at-risk customers and retention opportunities',
      icon: <Users className="w-5 h-5" />,
      category: 'Revenue Intelligence',
      helpTopics: [
        'Understanding churn risk scores',
        'Setting up retention campaigns',
        'Analyzing churn factors',
        'Configuring early warning alerts'
      ]
    }
  ];

  // FAQ Data
  const faqs: FAQItem[] = [
    {
      id: 'qb-connection',
      question: 'How do I connect my QuickBooks account to FinHelm.ai?',
      answer: 'Go to Settings > Integrations, click "Connect QuickBooks," and follow the OAuth authorization flow. You\'ll need admin access to your QuickBooks company file.',
      category: 'QuickBooks Integration'
    },
    {
      id: 'qb-permissions',
      question: 'What permissions does FinHelm.ai need in QuickBooks?',
      answer: 'We request read-only access to your chart of accounts, transactions, customers, vendors, and financial reports. We never request write permissions or access to sensitive data like SSNs or bank account details.',
      category: 'QuickBooks Integration'
    },
    {
      id: 'sync-frequency',
      question: 'How often does data sync from QuickBooks?',
      answer: 'Data syncs automatically every 4 hours. You can also trigger manual syncs from the Dashboard. Real-time sync is available on Professional and Enterprise plans.',
      category: 'Data Synchronization'
    },
    {
      id: 'data-accuracy',
      question: 'What if my QuickBooks data seems inaccurate in FinHelm?',
      answer: 'Check your QuickBooks data first, then try a manual sync. If issues persist, use the Data Reconciliation tool in Settings to identify and resolve discrepancies.',
      category: 'Troubleshooting'
    },
    {
      id: 'ai-insights-delay',
      question: 'Why are AI insights taking longer than usual?',
      answer: 'AI processing time depends on data volume and complexity. Large datasets or complex analysis may take 5-15 minutes. Check the Processing Status in your dashboard for updates.',
      category: 'AI Agents'
    },
    {
      id: 'multiple-companies',
      question: 'Can I connect multiple QuickBooks companies?',
      answer: 'Yes! Professional and Enterprise plans support multiple company connections. Each company gets its own workspace with separate AI insights and reporting.',
      category: 'Account Management'
    }
  ];

  // Troubleshooting guides
  const troubleshootingGuides = [
    {
      id: 'connection-failed',
      title: 'QuickBooks Connection Failed',
      description: 'Steps to resolve OAuth connection issues',
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      steps: [
        'Verify you have admin access to QuickBooks',
        'Clear browser cache and cookies',
        'Ensure popup blockers are disabled',
        'Try connecting from an incognito/private window',
        'Contact support if issues persist'
      ]
    },
    {
      id: 'sync-errors',
      title: 'Data Sync Errors',
      description: 'Resolve synchronization problems',
      icon: <Database className="w-5 h-5 text-yellow-500" />,
      steps: [
        'Check your QuickBooks subscription status',
        'Verify internet connection stability',
        'Review error logs in Settings > Sync History',
        'Try manual sync with smaller date ranges',
        'Contact support with error codes'
      ]
    },
    {
      id: 'slow-performance',
      title: 'Slow Dashboard Performance',
      description: 'Optimize dashboard loading speed',
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      steps: [
        'Reduce dashboard widget count',
        'Clear browser cache',
        'Check for browser extensions interfering',
        'Use Chrome or Firefox for best performance',
        'Upgrade to faster internet connection if needed'
      ]
    }
  ];

  // Filter FAQs based on search
  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter AI Agents based on search
  const filteredAgents = aiAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-8 h-8 text-sage-green" />
            <h1 className="text-3xl font-bold text-sage-dark">Support Center</h1>
          </div>
          <p className="text-sage-gray text-lg mb-6">
            Get help with QuickBooks integration, AI agents, and platform features
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-gray" />
            <input
              type="text"
              placeholder="Search for help topics, AI agents, or troubleshooting guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sage-green focus:border-sage-green"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: Book },
            { id: 'ai-agents', label: 'AI Agents Help', icon: Zap },
            { id: 'quickbooks', label: 'QuickBooks Setup', icon: Database },
            { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
            { id: 'videos', label: 'Video Tutorials', icon: Video },
            { id: 'contact', label: 'Contact Support', icon: MessageSquare }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-sage-green text-sage-green bg-green-50'
                  : 'border-transparent text-sage-gray hover:text-sage-dark hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Access Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="sage-card hover-lift cursor-pointer" onClick={() => setActiveTab('quickbooks')}>
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-6 h-6 text-sage-green" />
                    <h3 className="text-lg font-semibold text-sage-dark">QuickBooks Setup</h3>
                  </div>
                  <p className="text-sage-gray text-sm mb-4">
                    Connect your QuickBooks account and configure data synchronization
                  </p>
                  <div className="flex items-center gap-2 text-sage-green text-sm font-medium">
                    Get Started <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="sage-card hover-lift cursor-pointer" onClick={() => setActiveTab('ai-agents')}>
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-6 h-6 text-sage-green" />
                    <h3 className="text-lg font-semibold text-sage-dark">AI Agents Guide</h3>
                  </div>
                  <p className="text-sage-gray text-sm mb-4">
                    Learn how to use our 25+ AI agents for financial insights
                  </p>
                  <div className="flex items-center gap-2 text-sage-green text-sm font-medium">
                    Explore Agents <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="sage-card hover-lift cursor-pointer" onClick={() => setActiveTab('troubleshooting')}>
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <Wrench className="w-6 h-6 text-sage-green" />
                    <h3 className="text-lg font-semibold text-sage-dark">Troubleshooting</h3>
                  </div>
                  <p className="text-sage-gray text-sm mb-4">
                    Resolve common issues and technical problems
                  </p>
                  <div className="flex items-center gap-2 text-sage-green text-sm font-medium">
                    Fix Issues <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Help Topics */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">Popular Help Topics</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredFAQs.slice(0, 6).map((faq) => (
                    <div
                      key={faq.id}
                      className="p-4 border rounded-lg hover:bg-sage-light cursor-pointer transition-colors"
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sage-dark mb-1">{faq.question}</h4>
                          <p className="text-xs text-sage-green">{faq.category}</p>
                        </div>
                        {expandedFAQ === faq.id ? (
                          <ChevronDown className="w-4 h-4 text-sage-gray mt-1" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-sage-gray mt-1" />
                        )}
                      </div>
                      {expandedFAQ === faq.id && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sage-gray text-sm">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Options */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="sage-card hover-lift">
                <div className="sage-card-content text-center">
                  <MessageSquare className="w-8 h-8 text-sage-green mx-auto mb-3" />
                  <h3 className="font-semibold text-sage-dark mb-2">Live Chat</h3>
                  <p className="text-sage-gray text-sm mb-4">Get instant help from our support team</p>
                  <button className="btn-sage-primary text-sm">Start Chat</button>
                </div>
              </div>

              <div className="sage-card hover-lift">
                <div className="sage-card-content text-center">
                  <Mail className="w-8 h-8 text-sage-green mx-auto mb-3" />
                  <h3 className="font-semibold text-sage-dark mb-2">Email Support</h3>
                  <p className="text-sage-gray text-sm mb-4">Send us detailed questions and screenshots</p>
                  <a href="mailto:support@finhelm.ai" className="btn-sage-secondary text-sm">
                    Email Us
                  </a>
                </div>
              </div>

              <div className="sage-card hover-lift">
                <div className="sage-card-content text-center">
                  <Phone className="w-8 h-8 text-sage-green mx-auto mb-3" />
                  <h3 className="font-semibold text-sage-dark mb-2">Phone Support</h3>
                  <p className="text-sage-gray text-sm mb-4">Speak directly with our technical experts</p>
                  <a href="tel:+1-555-FINHELM" className="btn-sage-secondary text-sm">
                    Call Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Agents Help Tab */}
        {activeTab === 'ai-agents' && (
          <div className="space-y-8">
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-4">AI Agents Interactive Help</h3>
                <p className="text-sage-gray mb-6">
                  Select an AI agent below to learn how to configure and use it effectively for your business.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAgent === agent.id
                          ? 'border-sage-green bg-green-50'
                          : 'border-gray-200 hover:border-sage-green hover:bg-sage-light'
                      }`}
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-sage-green text-white rounded">
                          {agent.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sage-dark text-sm mb-1">{agent.name}</h4>
                          <p className="text-xs text-sage-gray mb-2">{agent.category}</p>
                          <p className="text-sage-gray text-xs">{agent.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedAgent && (
                  <div className="mt-6 p-6 bg-blue-50 rounded-lg border">
                    {(() => {
                      const agent = aiAgents.find(a => a.id === selectedAgent);
                      if (!agent) return null;
                      return (
                        <div>
                          <h4 className="text-lg font-semibold text-sage-dark mb-4">
                            How to use {agent.name}
                          </h4>
                          <div className="space-y-3">
                            {agent.helpTopics.map((topic, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <Lightbulb className="w-4 h-4 text-sage-green mt-0.5 flex-shrink-0" />
                                <div>
                                  <h5 className="font-medium text-sage-dark text-sm">{topic}</h5>
                                  <p className="text-sage-gray text-xs mt-1">
                                    Click for detailed guide and video tutorial
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t flex gap-3">
                            <button className="btn-sage-primary text-sm">
                              View Detailed Guide
                            </button>
                            <button className="btn-sage-secondary text-sm flex items-center gap-2">
                              <Video className="w-4 h-4" />
                              Watch Tutorial
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QuickBooks Setup Tab */}
        {activeTab === 'quickbooks' && (
          <div className="space-y-8">
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-4">QuickBooks Integration Setup</h3>
                
                {/* Step-by-step setup guide */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sage-dark mb-2">Verify QuickBooks Access</h4>
                      <p className="text-sage-gray text-sm mb-3">
                        Ensure you have administrator or full access permissions in your QuickBooks company file.
                      </p>
                      <div className="flex gap-2">
                        <CheckCircle className="w-4 h-4 text-sage-green mt-0.5" />
                        <span className="text-sage-gray text-sm">Admin or Company Admin role required</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sage-dark mb-2">Connect Your Account</h4>
                      <p className="text-sage-gray text-sm mb-3">
                        Navigate to Settings → Integrations and click "Connect QuickBooks"
                      </p>
                      <Link href="/dashboard/settings" className="btn-sage-primary text-sm">
                        Go to Settings
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sage-dark mb-2">Authorize Permissions</h4>
                      <p className="text-sage-gray text-sm mb-3">
                        Review and approve the data access permissions in the Intuit authorization window.
                      </p>
                      <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                        <p className="text-sage-dark text-sm">
                          <strong>Note:</strong> We only request read-only access to your financial data. 
                          We never ask for write permissions or access to sensitive information.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sage-dark mb-2">Initial Data Sync</h4>
                      <p className="text-sage-gray text-sm mb-3">
                        Wait for the initial synchronization to complete. This may take 5-15 minutes depending on your data size.
                      </p>
                      <div className="flex items-center gap-2 text-sage-green text-sm">
                        <Clock className="w-4 h-4" />
                        Typical sync time: 5-15 minutes
                      </div>
                    </div>
                  </div>
                </div>

                {/* Common Connection Issues */}
                <div className="mt-8 p-6 bg-red-50 rounded-lg border-l-4 border-red-400">
                  <h4 className="font-semibold text-sage-dark mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Common Connection Issues
                  </h4>
                  <div className="space-y-2">
                    {[
                      'Popup blocked: Disable popup blockers for finhelm.ai',
                      'Session timeout: Complete authorization within 10 minutes',
                      'Multiple tabs: Close other QuickBooks tabs before connecting',
                      'Browser cache: Clear cache if experiencing OAuth errors'
                    ].map((issue, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sage-dark text-sm">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section for QuickBooks */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-4">QuickBooks FAQs</h3>
                <div className="space-y-3">
                  {filteredFAQs.filter(faq => faq.category.includes('QuickBooks') || faq.category.includes('Data')).map((faq) => (
                    <div
                      key={faq.id}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-sage-light transition-colors"
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium text-sage-dark">{faq.question}</h4>
                        {expandedFAQ === faq.id ? (
                          <ChevronDown className="w-5 h-5 text-sage-gray" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-sage-gray" />
                        )}
                      </div>
                      {expandedFAQ === faq.id && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sage-gray">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Troubleshooting Tab */}
        {activeTab === 'troubleshooting' && (
          <div className="space-y-8">
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-4">Troubleshooting Guides</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {troubleshootingGuides.map((guide) => (
                    <div key={guide.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        {guide.icon}
                        <div>
                          <h4 className="font-semibold text-sage-dark">{guide.title}</h4>
                          <p className="text-sage-gray text-sm">{guide.description}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {guide.steps.map((step, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-sage-green text-white rounded-full text-xs flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-sage-gray text-sm">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-4">System Status</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { service: 'FinHelm API', status: 'operational', uptime: '99.9%' },
                    { service: 'QuickBooks Sync', status: 'operational', uptime: '99.7%' },
                    { service: 'AI Processing', status: 'operational', uptime: '99.8%' },
                    { service: 'Dashboard', status: 'operational', uptime: '99.9%' }
                  ].map((item) => (
                    <div key={item.service} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-sage-dark text-sm">{item.service}</span>
                      </div>
                      <p className="text-xs text-sage-gray">Uptime: {item.uptime}</p>
                      <p className="text-xs text-green-600 capitalize">{item.status}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <a 
                    href="https://status.finhelm.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sage-green hover:text-sage-green-hover text-sm"
                  >
                    View Full Status Page <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Tutorials Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-8">
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-4">Video Tutorials</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Getting Started with FinHelm.ai',
                      duration: '5:32',
                      thumbnail: '/api/placeholder/300/200',
                      description: 'Complete overview of platform features and navigation'
                    },
                    {
                      title: 'Connecting QuickBooks',
                      duration: '3:45',
                      thumbnail: '/api/placeholder/300/200',
                      description: 'Step-by-step QuickBooks integration guide'
                    },
                    {
                      title: 'Understanding AI Insights',
                      duration: '8:15',
                      thumbnail: '/api/placeholder/300/200',
                      description: 'How to interpret and act on AI-generated insights'
                    },
                    {
                      title: 'Setting Up Variance Analysis',
                      duration: '6:20',
                      thumbnail: '/api/placeholder/300/200',
                      description: 'Configure variance tracking and alerts'
                    },
                    {
                      title: 'Custom Dashboard Creation',
                      duration: '4:55',
                      thumbnail: '/api/placeholder/300/200',
                      description: 'Build personalized financial dashboards'
                    },
                    {
                      title: 'Troubleshooting Common Issues',
                      duration: '7:10',
                      thumbnail: '/api/placeholder/300/200',
                      description: 'Resolve sync errors and connection problems'
                    }
                  ].map((video, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative bg-gray-200 h-40 flex items-center justify-center">
                        <Play className="w-12 h-12 text-sage-green" />
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-sage-dark mb-2">{video.title}</h4>
                        <p className="text-sage-gray text-sm mb-3">{video.description}</p>
                        <button className="btn-sage-primary text-sm w-full">Watch Video</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Support Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Methods */}
              <div className="sage-card">
                <div className="sage-card-content">
                  <h3 className="text-xl font-semibold text-sage-dark mb-6">Contact Methods</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <MessageSquare className="w-6 h-6 text-sage-green mt-1" />
                      <div>
                        <h4 className="font-semibold text-sage-dark">Live Chat</h4>
                        <p className="text-sage-gray text-sm mb-2">Available 24/7 for instant support</p>
                        <button className="btn-sage-primary text-sm">Start Chat Now</button>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Mail className="w-6 h-6 text-sage-green mt-1" />
                      <div>
                        <h4 className="font-semibold text-sage-dark">Email Support</h4>
                        <p className="text-sage-gray text-sm mb-2">Response within 4 hours during business days</p>
                        <a href="mailto:support@finhelm.ai" className="btn-sage-secondary text-sm">
                          support@finhelm.ai
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Phone className="w-6 h-6 text-sage-green mt-1" />
                      <div>
                        <h4 className="font-semibold text-sage-dark">Phone Support</h4>
                        <p className="text-sage-gray text-sm mb-2">Monday-Friday, 8 AM - 8 PM EST</p>
                        <a href="tel:+1-555-346-4356" className="btn-sage-secondary text-sm">
                          +1 (555) FINHELM
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Hours */}
              <div className="sage-card">
                <div className="sage-card-content">
                  <h3 className="text-xl font-semibold text-sage-dark mb-6">Support Hours</h3>
                  
                  <div className="space-y-4">
                    {[
                      { day: 'Monday - Friday', hours: '8:00 AM - 8:00 PM EST', available: true },
                      { day: 'Saturday', hours: '10:00 AM - 6:00 PM EST', available: true },
                      { day: 'Sunday', hours: 'Live Chat Only', available: false },
                      { day: 'Holidays', hours: 'Limited Support', available: false }
                    ].map((schedule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium text-sage-dark">{schedule.day}</span>
                        <div className="text-right">
                          <div className="text-sage-gray text-sm">{schedule.hours}</div>
                          {schedule.available && (
                            <div className="text-green-600 text-xs">✓ Full Support</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Priority Support</h4>
                    <p className="text-sage-gray text-sm">
                      Professional and Enterprise plan subscribers receive priority support with 
                      faster response times and dedicated account managers.
                    </p>
                    <Link href="/settings/billing" className="text-sage-green hover:underline text-sm mt-2 inline-block">
                      Upgrade for Priority Support
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Ticket Form */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">Submit Support Ticket</h3>
                
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-sage-dark mb-2">
                        Issue Category
                      </label>
                      <select className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green">
                        <option>QuickBooks Integration</option>
                        <option>AI Agents & Insights</option>
                        <option>Data Synchronization</option>
                        <option>Dashboard & Reports</option>
                        <option>Billing & Account</option>
                        <option>Technical Issues</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-sage-dark mb-2">
                        Priority Level
                      </label>
                      <select className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green">
                        <option>Low - General Question</option>
                        <option>Medium - Feature Issue</option>
                        <option>High - Service Disruption</option>
                        <option>Critical - System Down</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-dark mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="Brief description of your issue"
                      className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-dark mb-2">
                      Description
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Please provide detailed information about your issue, including steps to reproduce and any error messages"
                      className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-dark mb-2">
                      Attachments
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded p-6 text-center">
                      <FileText className="w-8 h-8 text-sage-gray mx-auto mb-2" />
                      <p className="text-sage-gray text-sm">
                        Drop screenshots or files here, or click to browse
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" className="btn-sage-primary">
                      Submit Ticket
                    </button>
                    <button type="button" className="btn-sage-secondary">
                      Save Draft
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}