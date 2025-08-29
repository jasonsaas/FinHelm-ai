import Link from "next/link";
import { BarChart3, TrendingUp, Zap, Shield, CheckCircle, ArrowRight, PieChart, Building2, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white relative">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-sage-green" />
            <span className="text-2xl font-bold text-sage-dark">FinHelm</span>
            <span className="text-sm text-sage-gray font-medium">| Built for Sage Intacct</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sage-dark hover:text-sage-green transition-colors font-medium">Features</a>
            <a href="#trust" className="text-sage-dark hover:text-sage-green transition-colors font-medium">Integration</a>
            <a href="#demo" className="text-sage-dark hover:text-sage-green transition-colors font-medium">Demo</a>
            <Link href="/dashboard" className="btn-sage-primary">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10">
        <div className="container mx-auto px-6 py-16">
          {/* Hero Section */}
          <section className="text-center py-24 bg-white">
            <h1 className="text-5xl md:text-6xl font-bold text-sage-dark mb-6 leading-tight">
              AI-Powered Financial Management<br />
              <span className="text-sage-gradient">for Sage Intacct</span>
            </h1>
            <p className="text-xl text-sage-gray max-w-3xl mx-auto mb-8 leading-relaxed">
              Extend your Sage Intacct investment with intelligent automation and insights. 
              Transform your financial operations with AI that understands your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                href="/dashboard"
                className="btn-sage-primary text-lg"
              >
                Start Free Trial
              </Link>
              <button className="btn-sage-secondary text-lg">
                Watch Demo
              </button>
            </div>
          </section>

          {/* Trust Bar */}
          <section className="bg-sage-light py-4">
            <div className="container mx-auto px-6 text-center">
              <p className="text-sage-gray text-sm font-medium">
                Certified Sage Intacct Partner • SOC 2 Type II Compliant • Trusted by 500+ Companies
              </p>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20 bg-white">
            <div className="container mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-sage-dark mb-4">Purpose-Built for Sage Intacct</h2>
                <p className="text-xl text-sage-gray max-w-3xl mx-auto">
                  Unlock the full potential of your Sage Intacct investment with AI-powered insights
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: <BarChart3 className="h-12 w-12 text-sage-green" />,
                    title: "Native Intacct Integration",
                    description: "Direct API connection to your Sage Intacct system. No data duplication, complete security, real-time insights."
                  },
                  {
                    icon: <PieChart className="h-12 w-12 text-sage-green" />,
                    title: "Dimensional Reporting", 
                    description: "AI-powered analysis across all your dimensions - departments, locations, projects, and custom fields."
                  },
                  {
                    icon: <Zap className="h-12 w-12 text-sage-green" />,
                    title: "Intelligent Automation",
                    description: "Reduce manual tasks by 70%. Automated reporting, anomaly detection, and proactive insights."
                  }
                ].map((feature, index) => (
                  <div key={index} className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow border">
                    <div className="mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold mb-3 text-sage-dark">{feature.title}</h3>
                    <p className="text-sage-gray leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-20 bg-sage-light">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-3 gap-12 text-center">
                <div>
                  <div className="text-4xl font-bold text-sage-green mb-2">50%</div>
                  <div className="text-xl font-semibold text-sage-dark mb-2">Faster Close</div>
                  <p className="text-sage-gray">Accelerate your monthly close process with automated insights and exception reporting</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-sage-green mb-2">Real-time</div>
                  <div className="text-xl font-semibold text-sage-dark mb-2">Intelligence</div>
                  <p className="text-sage-gray">Get instant visibility into your financial performance across all dimensions</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-sage-green mb-2">70%</div>
                  <div className="text-xl font-semibold text-sage-dark mb-2">Less Manual Work</div>
                  <p className="text-sage-gray">Scale your operations without adding headcount through intelligent automation</p>
                </div>
              </div>
            </div>
          </section>

          {/* Trust Section */}
          <section id="trust" className="py-16 bg-white">
            <div className="container mx-auto px-6">
              <div className="flex justify-center items-center gap-12">
                <div className="text-center">
                  <div className="bg-white rounded-lg p-6 shadow-sm border inline-block">
                    <CheckCircle className="h-12 w-12 text-sage-green mx-auto mb-2" />
                    <div className="text-sm font-semibold text-sage-dark">Certified Partner</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg p-6 shadow-sm border inline-block">
                    <Shield className="h-12 w-12 text-sage-green mx-auto mb-2" />
                    <div className="text-sm font-semibold text-sage-dark">SOC 2 Type II</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg p-6 shadow-sm border inline-block">
                    <Building2 className="h-12 w-12 text-sage-green mx-auto mb-2" />
                    <div className="text-sm font-semibold text-sage-dark">Enterprise Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section id="demo" className="py-20 bg-sage-green text-white">
            <div className="container mx-auto px-6 text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Financial Operations?</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                Join finance teams who have accelerated their close process and gained real-time insights with FinHelm.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button className="btn-sage-orange text-lg">
                  Schedule a Demo
                  <ArrowRight className="h-5 w-5 ml-2 inline" />
                </button>
                <Link href="/dashboard" className="btn-sage-secondary text-lg bg-white text-sage-green hover:bg-gray-100">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 py-12">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h4 className="font-semibold text-sage-dark mb-4">Product</h4>
                  <ul className="space-y-2 text-sage-gray">
                    <li><a href="#features" className="hover:text-sage-green">Features</a></li>
                    <li><a href="#" className="hover:text-sage-green">Pricing</a></li>
                    <li><a href="#" className="hover:text-sage-green">Integration</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sage-dark mb-4">Company</h4>
                  <ul className="space-y-2 text-sage-gray">
                    <li><a href="#" className="hover:text-sage-green">About</a></li>
                    <li><a href="#" className="hover:text-sage-green">Partners</a></li>
                    <li><a href="#" className="hover:text-sage-green">Contact</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sage-dark mb-4">Resources</h4>
                  <ul className="space-y-2 text-sage-gray">
                    <li><a href="#" className="hover:text-sage-green">Documentation</a></li>
                    <li><a href="#" className="hover:text-sage-green">Support</a></li>
                    <li><a href="#" className="hover:text-sage-green">Training</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <BarChart3 className="h-6 w-6 text-sage-green" />
                  <span className="text-2xl font-bold text-sage-dark">FinHelm</span>
                </div>
                <p className="text-sage-gray">© 2024 FinHelm. A Certified Sage Intacct Partner Solution</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
