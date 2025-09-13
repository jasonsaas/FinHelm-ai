import { Metadata } from 'next';
import Link from 'next/link';
import { Scale, AlertCircle, CreditCard, Zap, Shield, Users, FileText, CheckCircle, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - FinHelm.ai | QuickBooks App Store Compliant',
  description: 'Comprehensive Terms of Service with Intuit-specific clauses, liability limitations, and API usage terms for QuickBooks integration.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-sage-green" />
            <h1 className="text-3xl font-bold text-sage-dark">Terms of Service</h1>
          </div>
          <p className="text-sage-gray text-lg">
            Legal terms governing your use of FinHelm.ai services and QuickBooks integration
          </p>
          <p className="text-sm text-sage-gray mt-2">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Navigation */}
        <div className="sage-card mb-8">
          <div className="sage-card-content">
            <h2 className="text-xl font-semibold text-sage-dark mb-4">Quick Navigation</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { href: "#agreement", title: "Service Agreement", icon: FileText },
                { href: "#intuit-terms", title: "QuickBooks/Intuit Terms", icon: Zap },
                { href: "#subscription", title: "Subscription & Billing", icon: CreditCard },
                { href: "#liability", title: "Liability Limitations", icon: Shield },
                { href: "#api-usage", title: "API Usage Limitations", icon: Users },
                { href: "#termination", title: "Account Termination", icon: XCircle },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded border hover:bg-sage-light transition-colors"
                >
                  <item.icon className="w-5 h-5 text-sage-green" />
                  <span className="text-sage-dark font-medium">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Agreement Overview */}
        <section className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Agreement Overview</h2>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sage-dark text-lg leading-relaxed mb-4">
                Welcome to FinHelm.ai! These Terms of Service ("Terms") govern your use of our AI-powered 
                financial intelligence platform, including our QuickBooks integration and related services.
              </p>
              <div className="bg-white p-4 rounded border-l-4 border-sage-green">
                <p className="text-sage-dark font-semibold mb-2">Key Points:</p>
                <ul className="text-sage-gray space-y-1 text-sm">
                  <li>• By using FinHelm.ai, you agree to these Terms and our Privacy Policy</li>
                  <li>• You must have valid QuickBooks access to use our QuickBooks integration features</li>
                  <li>• You are responsible for the accuracy of data you provide to our platform</li>
                  <li>• We provide AI-powered insights but you make all business decisions</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Service Agreement */}
        <section id="agreement" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Service Agreement</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Acceptance of Terms</h3>
                <div className="p-6 border rounded-lg bg-gray-50">
                  <p className="text-sage-dark mb-4">
                    By accessing or using FinHelm.ai, you agree to be bound by these Terms. If you disagree 
                    with any part of these terms, then you may not access the service.
                  </p>
                  <p className="text-sage-dark">
                    These Terms apply to all visitors, users, and others who access or use the service, 
                    including those who use our QuickBooks integration features.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Description of Service</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sage-green" />
                      AI Financial Intelligence
                    </h4>
                    <p className="text-sage-gray text-sm">
                      Advanced AI algorithms analyze your financial data to provide insights, 
                      forecasts, and recommendations for business optimization.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-sage-green" />
                      QuickBooks Integration
                    </h4>
                    <p className="text-sage-gray text-sm">
                      Secure connection to your QuickBooks data for real-time financial 
                      analysis and automated reporting capabilities.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-sage-green" />
                      Anomaly Detection
                    </h4>
                    <p className="text-sage-gray text-sm">
                      Intelligent monitoring of your financial transactions to identify 
                      unusual patterns and potential issues requiring attention.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sage-green" />
                      Custom Reports
                    </h4>
                    <p className="text-sage-gray text-sm">
                      Automated generation of financial reports, dashboards, and presentations 
                      tailored to your business needs and stakeholder requirements.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">User Responsibilities</h3>
                <div className="space-y-3">
                  {[
                    {
                      title: "Account Security",
                      description: "You are responsible for safeguarding your account credentials and all activities under your account."
                    },
                    {
                      title: "Data Accuracy", 
                      description: "You must ensure that all information provided to FinHelm.ai is accurate, current, and complete."
                    },
                    {
                      title: "Compliance",
                      description: "You must use FinHelm.ai in compliance with all applicable laws, regulations, and third-party terms."
                    },
                    {
                      title: "Proper Use",
                      description: "You may not use FinHelm.ai for any unlawful purpose or in any way that could damage our services."
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                      <CheckCircle className="w-5 h-5 text-sage-green mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-sage-dark">{item.title}</h4>
                        <p className="text-sage-gray text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intuit/QuickBooks Specific Terms */}
        <section id="intuit-terms" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">QuickBooks Integration Terms</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-sage-dark">Important Notice</h3>
                </div>
                <p className="text-sage-dark">
                  FinHelm.ai is a third-party application that integrates with QuickBooks through Intuit's 
                  official APIs. We are not affiliated with, sponsored by, or endorsed by Intuit Inc. 
                  QuickBooks is a trademark of Intuit Inc.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">QuickBooks Connection Requirements</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Valid QuickBooks Subscription</h4>
                    <p className="text-sage-gray text-sm">
                      You must have an active, valid QuickBooks subscription to use our integration features. 
                      We are not responsible for QuickBooks service availability or pricing.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Administrative Access</h4>
                    <p className="text-sage-gray text-sm">
                      You must have administrator or appropriate user permissions in QuickBooks to authorize 
                      FinHelm.ai's access to your financial data.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Data Synchronization</h4>
                    <p className="text-sage-gray text-sm">
                      Our service synchronizes with QuickBooks data in real-time. You acknowledge that 
                      changes in QuickBooks will be reflected in FinHelm.ai.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Intuit Terms Compliance</h4>
                    <p className="text-sage-gray text-sm">
                      Your use of FinHelm.ai must comply with Intuit's Terms of Service and 
                      QuickBooks API Terms and Conditions.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Third-Party Dependencies</h3>
                <div className="p-6 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-sage-dark mb-3">Service Availability Disclaimer</h4>
                  <p className="text-sage-dark mb-3">
                    FinHelm.ai's functionality depends on third-party services, including but not limited to:
                  </p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Intuit QuickBooks API availability and performance",
                      "Internet connectivity and network infrastructure", 
                      "Cloud service providers and data centers",
                      "AI/ML processing services and computational resources"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sage-dark text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sage-dark text-sm">
                    <strong>We are not liable for service interruptions caused by third-party dependencies.</strong> 
                    While we strive for 99.9% uptime, we cannot guarantee uninterrupted service due to factors 
                    beyond our control.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription and Billing */}
        <section id="subscription" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Subscription & Billing</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Pricing Plans</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-6 border rounded-lg bg-green-50">
                    <h4 className="font-bold text-sage-dark text-lg mb-2">Starter</h4>
                    <p className="text-2xl font-bold text-sage-green mb-3">$29<span className="text-sm text-sage-gray">/month</span></p>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• Up to 5 AI agents</li>
                      <li>• Basic financial insights</li>
                      <li>• QuickBooks integration</li>
                      <li>• Email support</li>
                    </ul>
                  </div>
                  <div className="p-6 border-2 border-sage-green rounded-lg bg-white relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-sage-green text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                    <h4 className="font-bold text-sage-dark text-lg mb-2">Professional</h4>
                    <p className="text-2xl font-bold text-sage-green mb-3">$89<span className="text-sm text-sage-gray">/month</span></p>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• All 25+ AI agents</li>
                      <li>• Advanced analytics</li>
                      <li>• Multi-ERP support</li>
                      <li>• Priority support</li>
                      <li>• Custom reports</li>
                    </ul>
                  </div>
                  <div className="p-6 border rounded-lg bg-blue-50">
                    <h4 className="font-bold text-sage-dark text-lg mb-2">Enterprise</h4>
                    <p className="text-2xl font-bold text-sage-green mb-3">Custom</p>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• Unlimited AI agents</li>
                      <li>• White-label options</li>
                      <li>• Dedicated support</li>
                      <li>• Custom integrations</li>
                      <li>• SLA guarantees</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Billing Terms</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Payment Processing</h4>
                    <p className="text-sage-gray text-sm mb-2">
                      All payments are processed securely through Stripe. We accept major credit cards, 
                      debit cards, and ACH transfers for annual plans.
                    </p>
                    <ul className="text-sage-gray text-sm space-y-1">
                      <li>• Monthly subscriptions are billed in advance</li>
                      <li>• Annual subscriptions receive a 15% discount</li>
                      <li>• All prices are in USD unless otherwise specified</li>
                      <li>• Taxes may apply based on your location</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Refund Policy</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-sage-dark mb-1">30-Day Money-Back Guarantee</h5>
                        <p className="text-sage-gray text-sm">
                          New subscribers can cancel within 30 days for a full refund. 
                          This applies to the first billing cycle only.
                        </p>
                      </div>
                      <div>
                        <h5 className="font-medium text-sage-dark mb-1">Pro-Rated Cancellations</h5>
                        <p className="text-sage-gray text-sm">
                          For annual plans, unused portions are refunded on a pro-rated basis 
                          when cancelled after the 30-day guarantee period.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-yellow-50">
                    <h4 className="font-semibold text-sage-dark mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      Price Changes
                    </h4>
                    <p className="text-sage-gray text-sm">
                      We may change our pricing from time to time. Existing subscribers will be notified 
                      30 days before any price changes take effect. Price changes will not affect your 
                      current billing cycle.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Liability Limitations */}
        <section id="liability" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Liability Limitations</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-400">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-sage-dark">Important Legal Notice</h3>
                </div>
                <p className="text-sage-dark mb-3">
                  <strong>FinHelm.ai provides financial insights and recommendations but does not provide 
                  financial, legal, or accounting advice.</strong> All business decisions based on our 
                  insights are made at your own discretion and risk.
                </p>
                <p className="text-sage-dark text-sm">
                  Always consult with qualified professionals before making significant financial decisions.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Disclaimer of Warranties</h3>
                <div className="p-6 border rounded-lg bg-gray-50">
                  <p className="text-sage-dark mb-4">
                    <strong>FinHelm.ai is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, 
                    either express or implied, including but not limited to:</strong>
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="space-y-2">
                      {[
                        "Accuracy of financial insights or predictions",
                        "Completeness of data analysis or reports",
                        "Uninterrupted or error-free operation",
                        "Compatibility with all systems or software"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sage-gray text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-2">
                      {[
                        "Merchantability or fitness for purpose",
                        "Security against unauthorized access",
                        "Absence of viruses or harmful components",
                        "Compliance with specific regulations"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sage-gray text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Limitation of Liability</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Financial Data Liability</h4>
                    <p className="text-sage-gray text-sm">
                      We are not liable for business losses, financial damages, or decisions made based on 
                      our AI insights. Our liability for any financial data inaccuracies is limited to 
                      the amount paid for our services in the preceding 12 months.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Maximum Liability Cap</h4>
                    <p className="text-sage-gray text-sm">
                      Our total liability to you for all claims arising out of or related to these Terms 
                      or FinHelm.ai shall not exceed the greater of $100 or the amounts paid by you to 
                      FinHelm.ai in the 12 months preceding the claim.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Excluded Damages</h4>
                    <p className="text-sage-gray text-sm">
                      We shall not be liable for indirect, incidental, special, consequential, or punitive 
                      damages, including but not limited to loss of profits, data, use, goodwill, or other 
                      intangible losses.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Usage Limitations */}
        <section id="api-usage" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">API Usage Limitations</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Rate Limits</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <h4 className="font-bold text-sage-dark text-lg">Starter Plan</h4>
                    <p className="text-2xl font-bold text-sage-green my-2">1,000</p>
                    <p className="text-sage-gray text-sm">API calls per month</p>
                  </div>
                  <div className="p-4 border-2 border-sage-green rounded-lg text-center bg-green-50">
                    <h4 className="font-bold text-sage-dark text-lg">Professional</h4>
                    <p className="text-2xl font-bold text-sage-green my-2">10,000</p>
                    <p className="text-sage-gray text-sm">API calls per month</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h4 className="font-bold text-sage-dark text-lg">Enterprise</h4>
                    <p className="text-2xl font-bold text-sage-green my-2">Unlimited</p>
                    <p className="text-sage-gray text-sm">Subject to fair use</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Acceptable Use Policy</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-sage-green" />
                      Permitted Uses
                    </h4>
                    <ul className="space-y-2">
                      {[
                        "Business financial analysis and reporting",
                        "Automated data synchronization with QuickBooks",
                        "AI-powered insights for decision making",
                        "Integration with your business applications",
                        "Sharing insights within your organization"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-sage-green mt-0.5 flex-shrink-0" />
                          <span className="text-sage-gray text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Prohibited Uses
                    </h4>
                    <ul className="space-y-2">
                      {[
                        "Reselling or redistributing our services",
                        "Reverse engineering our AI algorithms",
                        "Excessive automated requests (abuse)",
                        "Sharing data with unauthorized third parties",
                        "Using data for competitive intelligence"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sage-gray text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Data Usage Restrictions</h3>
                <div className="p-6 border rounded-lg bg-yellow-50">
                  <p className="text-sage-dark mb-4">
                    <strong>Important:</strong> Your use of FinHelm.ai must comply with both our terms 
                    and the terms of service of integrated platforms (QuickBooks, Sage Intacct, etc.).
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sage-dark mb-2">QuickBooks API Compliance</h4>
                      <ul className="text-sage-gray text-sm space-y-1">
                        <li>• Respect Intuit's rate limiting requirements</li>
                        <li>• Use data only for authorized business purposes</li>
                        <li>• Comply with Intuit's data retention policies</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sage-dark mb-2">Data Security Requirements</h4>
                      <ul className="text-sage-gray text-sm space-y-1">
                        <li>• Maintain secure access to your QuickBooks account</li>
                        <li>• Regularly review connected applications</li>
                        <li>• Report suspicious activity immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Termination */}
        <section id="termination" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Account Termination</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Termination by You</h3>
                <div className="p-6 border rounded-lg">
                  <p className="text-sage-dark mb-4">
                    You may terminate your account at any time by visiting your account settings or 
                    contacting our support team. Upon termination:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">Immediate Effects</h4>
                      <ul className="text-sage-gray text-sm space-y-1">
                        <li>• Access to FinHelm.ai services is suspended</li>
                        <li>• QuickBooks integration is disconnected</li>
                        <li>• Billing stops at the end of current period</li>
                        <li>• Data export is available for 30 days</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">Data Retention</h4>
                      <ul className="text-sage-gray text-sm space-y-1">
                        <li>• 30-day grace period for data recovery</li>
                        <li>• Complete data deletion after 30 days</li>
                        <li>• Audit logs retained per compliance requirements</li>
                        <li>• No access to historical AI insights</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Termination by FinHelm.ai</h3>
                <div className="p-6 border rounded-lg bg-red-50">
                  <p className="text-sage-dark mb-4">
                    We may terminate or suspend your account immediately if you:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Violate these Terms of Service or our Privacy Policy",
                      "Use the service for illegal or unauthorized purposes",
                      "Fail to pay subscription fees after multiple attempts",
                      "Engage in activities that harm our service or other users",
                      "Provide false or misleading information during registration"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sage-dark text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sage-dark text-sm mt-4">
                    <strong>We will provide 7 days' notice when possible, except for cases involving 
                    security threats or legal violations.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact and Changes */}
        <section className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Changes to Terms & Contact</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Updates to These Terms</h3>
                <p className="text-sage-gray mb-4">
                  We may update these Terms from time to time. When we do, we will:
                </p>
                <ul className="space-y-2">
                  {[
                    "Post the new Terms on this page",
                    "Update the "Last updated" date",
                    "Send email notification for material changes",
                    "Provide 30 days' notice for significant changes"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-sage-green mt-0.5 flex-shrink-0" />
                      <span className="text-sage-gray text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sage-dark">Legal Questions</h4>
                    <p className="text-sage-gray">legal@finhelm.ai</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark">Support Team</h4>
                    <Link href="/support" className="text-sage-green hover:underline">
                      Visit Support Center
                    </Link>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark">Mailing Address</h4>
                    <p className="text-sage-gray text-sm">
                      FinHelm.ai Legal Department<br />
                      123 Financial District<br />
                      San Francisco, CA 94105<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="flex flex-wrap gap-4 justify-center pt-8 border-t">
          <Link href="/privacy" className="text-sage-green hover:text-sage-green-hover">
            Privacy Policy
          </Link>
          <Link href="/support" className="text-sage-green hover:text-sage-green-hover">
            Support Center
          </Link>
          <Link href="/settings/data" className="text-sage-green hover:text-sage-green-hover">
            Data Management
          </Link>
          <Link href="/dashboard" className="text-sage-green hover:text-sage-green-hover">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}