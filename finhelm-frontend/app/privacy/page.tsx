import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Eye, Database, Clock, UserX, FileText, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - FinHelm.ai | QuickBooks App Store Compliant',
  description: 'Comprehensive privacy policy detailing how FinHelm.ai protects your QuickBooks data with enterprise-grade security and full GDPR/CCPA compliance.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-sage-green" />
            <h1 className="text-3xl font-bold text-sage-dark">Privacy Policy</h1>
          </div>
          <p className="text-sage-gray text-lg">
            How FinHelm.ai protects your QuickBooks data with enterprise-grade security
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
                { href: "#quickbooks-data", title: "QuickBooks Data Handling", icon: Database },
                { href: "#encryption", title: "Security & Encryption", icon: Lock },
                { href: "#gdpr-ccpa", title: "GDPR & CCPA Compliance", icon: FileText },
                { href: "#data-retention", title: "Data Retention & Deletion", icon: Clock },
                { href: "#your-rights", title: "Your Privacy Rights", icon: Eye },
                { href: "#contact", title: "Contact Us", icon: UserX },
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

        {/* Data Collection Overview */}
        <section className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Our Privacy Commitment</h2>
            </div>
            <div className="bg-sage-light p-6 rounded-lg mb-6">
              <p className="text-sage-dark text-lg leading-relaxed">
                FinHelm.ai is committed to protecting your privacy and ensuring the security of your financial data. 
                We collect and process only the minimum data necessary to provide our AI-powered financial insights, 
                and we never sell, rent, or share your personal information with third parties for marketing purposes.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Shield className="w-8 h-8 text-sage-green mx-auto mb-2" />
                <h3 className="font-semibold text-sage-dark">SOC 2 Type II Certified</h3>
                <p className="text-sm text-sage-gray">Enterprise security standards</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Lock className="w-8 h-8 text-sage-green mx-auto mb-2" />
                <h3 className="font-semibold text-sage-dark">256-bit Encryption</h3>
                <p className="text-sm text-sage-gray">Bank-grade data protection</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <FileText className="w-8 h-8 text-sage-green mx-auto mb-2" />
                <h3 className="font-semibold text-sage-dark">GDPR/CCPA Compliant</h3>
                <p className="text-sm text-sage-gray">Full regulatory compliance</p>
              </div>
            </div>
          </div>
        </section>

        {/* QuickBooks Data Handling */}
        <section id="quickbooks-data" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">QuickBooks Data Handling</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">What QuickBooks Data We Access</h3>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <p className="text-sage-dark mb-4">
                    FinHelm.ai only accesses the specific QuickBooks data necessary to provide financial insights:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Chart of Accounts and account balances",
                      "Transaction history (invoices, bills, payments)",
                      "Customer and vendor information (names and basic details only)",
                      "Financial reports (P&L, Balance Sheet, Cash Flow)",
                      "Company information (name, industry, fiscal year)"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-sage-green mt-0.5 flex-shrink-0" />
                        <span className="text-sage-dark">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Data We Never Access</h3>
                <div className="bg-red-50 p-6 rounded-lg">
                  <ul className="space-y-2">
                    {[
                      "Social Security Numbers or Tax IDs",
                      "Bank account numbers or routing information",
                      "Credit card or payment processing details",
                      "Personal employee information beyond basic contact details",
                      "Any data marked as confidential or restricted in QuickBooks"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <UserX className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sage-dark">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">How We Use Your QuickBooks Data</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">AI Financial Analysis</h4>
                    <p className="text-sage-gray text-sm">
                      Generate insights, forecasts, and recommendations based on your financial patterns and trends.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Anomaly Detection</h4>
                    <p className="text-sage-gray text-sm">
                      Identify unusual transactions or patterns that may require your attention.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Automated Reporting</h4>
                    <p className="text-sage-gray text-sm">
                      Create custom reports and dashboards tailored to your business needs.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Compliance Monitoring</h4>
                    <p className="text-sage-gray text-sm">
                      Help ensure your financial data meets regulatory requirements and best practices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Encryption */}
        <section id="encryption" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Security & Encryption</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Enterprise-Grade Security</h3>
                <p className="text-sage-dark mb-4">
                  Your QuickBooks data is protected with the same security standards used by major financial institutions.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-2">Data in Transit</h4>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• TLS 1.3 encryption for all API communications</li>
                      <li>• Certificate pinning for additional security</li>
                      <li>• Secure OAuth 2.0 authentication with Intuit</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-2">Data at Rest</h4>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• AES-256 encryption for all stored data</li>
                      <li>• Encrypted database with rotating keys</li>
                      <li>• Secure backup with point-in-time recovery</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Access Controls</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Multi-Factor Authentication</h4>
                    <p className="text-sm text-sage-gray">Required for all administrative access</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Role-Based Access</h4>
                    <p className="text-sm text-sage-gray">Employees only access data necessary for their role</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Audit Logging</h4>
                    <p className="text-sm text-sage-gray">Complete logs of all data access and modifications</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Infrastructure Security</h3>
                <ul className="space-y-2">
                  {[
                    "SOC 2 Type II certified data centers with 24/7 monitoring",
                    "Regular penetration testing and vulnerability assessments", 
                    "Dedicated security team with incident response procedures",
                    "ISO 27001 certified security management system",
                    "Regular security training for all employees"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-sage-green mt-0.5 flex-shrink-0" />
                      <span className="text-sage-dark">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* GDPR & CCPA Compliance */}
        <section id="gdpr-ccpa" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">GDPR & CCPA Compliance</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Your Data Protection Rights</h3>
                <p className="text-sage-dark mb-4">
                  We comply with both GDPR (EU) and CCPA (California) regulations, giving you comprehensive control over your personal data.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-2">GDPR Rights (EU Residents)</h4>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• Right to access your data</li>
                      <li>• Right to rectification (correction)</li>
                      <li>• Right to erasure ("right to be forgotten")</li>
                      <li>• Right to restrict processing</li>
                      <li>• Right to data portability</li>
                      <li>• Right to object to processing</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-2">CCPA Rights (California Residents)</h4>
                    <ul className="text-sm text-sage-gray space-y-1">
                      <li>• Right to know what personal information is collected</li>
                      <li>• Right to know if personal information is sold</li>
                      <li>• Right to say no to the sale of personal information</li>
                      <li>• Right to access your personal information</li>
                      <li>• Right to equal service and price</li>
                      <li>• Right to delete personal information</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">How to Exercise Your Rights</h3>
                <div className="p-6 border rounded-lg">
                  <p className="text-sage-dark mb-4">
                    To exercise any of your privacy rights, contact us using any of these methods:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">Online Request</h4>
                      <Link
                        href="/settings/data"
                        className="inline-flex items-center gap-2 text-sage-green hover:text-sage-green-hover"
                      >
                        <Eye className="w-4 h-4" />
                        Visit Data Management Portal
                      </Link>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">Email Request</h4>
                      <a
                        href="mailto:privacy@finhelm.ai"
                        className="inline-flex items-center gap-2 text-sage-green hover:text-sage-green-hover"
                      >
                        <FileText className="w-4 h-4" />
                        privacy@finhelm.ai
                      </a>
                    </div>
                  </div>
                  <p className="text-sm text-sage-gray mt-4">
                    We will respond to your request within 30 days (GDPR) or 45 days (CCPA) as required by law.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Retention & Deletion */}
        <section id="data-retention" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Data Retention & Deletion</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Retention Periods</h3>
                <p className="text-sage-dark mb-4">
                  We retain your data only as long as necessary to provide our services and comply with legal obligations:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded border">
                    <h4 className="font-semibold text-sage-dark mb-2">Active Account Data</h4>
                    <p className="text-sm text-sage-gray">
                      Retained while your account is active and for up to 90 days after cancellation to allow for reactivation.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded border">
                    <h4 className="font-semibold text-sage-dark mb-2">Financial Analysis Data</h4>
                    <p className="text-sm text-sage-gray">
                      Aggregated and anonymized insights may be retained for up to 7 years for compliance and service improvement.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded border">
                    <h4 className="font-semibold text-sage-dark mb-2">Audit Logs</h4>
                    <p className="text-sm text-sage-gray">
                      Security and access logs are retained for 7 years as required by financial regulations.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded border">
                    <h4 className="font-semibold text-sage-dark mb-2">Support Communications</h4>
                    <p className="text-sm text-sage-gray">
                      Customer support communications are retained for 3 years for quality and training purposes.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Deletion Process</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-sage-dark">Immediate Deletion</h4>
                      <p className="text-sm text-sage-gray">
                        When you delete your account, we immediately remove your access and begin the deletion process.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-sage-dark">30-Day Grace Period</h4>
                      <p className="text-sm text-sage-gray">
                        Your data is marked for deletion but retained for 30 days in case you change your mind.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-sage-dark">Permanent Deletion</h4>
                      <p className="text-sm text-sage-gray">
                        After 30 days, all your personal data is permanently deleted from our systems and backups.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section id="contact" className="sage-card mb-8">
          <div className="sage-card-content">
            <div className="flex items-center gap-3 mb-4">
              <UserX className="w-6 h-6 text-sage-green" />
              <h2 className="text-2xl font-bold text-sage-dark">Contact Information</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">Privacy Questions</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sage-dark">Data Protection Officer</h4>
                    <p className="text-sage-gray">privacy@finhelm.ai</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark">Mailing Address</h4>
                    <p className="text-sage-gray">
                      FinHelm.ai Privacy Team<br />
                      123 Financial District<br />
                      San Francisco, CA 94105<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-sage-dark mb-3">EU Representative</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sage-dark">GDPR Representative</h4>
                    <p className="text-sage-gray">gdpr@finhelm.ai</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sage-dark">EU Office</h4>
                    <p className="text-sage-gray">
                      FinHelm EU Privacy Office<br />
                      Financial Quarter<br />
                      Dublin 2, Ireland<br />
                      European Union
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-sage-light rounded-lg">
              <p className="text-sage-dark">
                <strong>Questions about this policy?</strong> We're here to help. Reach out to our privacy team 
                at <a href="mailto:privacy@finhelm.ai" className="text-sage-green hover:underline">privacy@finhelm.ai</a> 
                or visit our <Link href="/support" className="text-sage-green hover:underline">Support Center</Link> 
                for immediate assistance.
              </p>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="flex flex-wrap gap-4 justify-center pt-8 border-t">
          <Link href="/terms" className="text-sage-green hover:text-sage-green-hover">
            Terms of Service
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