import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface ComplianceLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  lastUpdated?: Date;
  children: React.ReactNode;
  showNavigation?: boolean;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function ComplianceLayout({
  title,
  description,
  icon: Icon,
  lastUpdated = new Date(),
  children,
  showNavigation = true
}: ComplianceLayoutProps) {
  const navigationItems: NavigationItem[] = [
    {
      href: '/privacy',
      label: 'Privacy Policy',
      icon: require('lucide-react').Shield
    },
    {
      href: '/terms',
      label: 'Terms of Service',
      icon: require('lucide-react').Scale
    },
    {
      href: '/support',
      label: 'Support Center',
      icon: require('lucide-react').HelpCircle
    },
    {
      href: '/settings/data',
      label: 'Data Management',
      icon: require('lucide-react').Database
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Icon className="w-8 h-8 text-sage-green" />
            <h1 className="text-3xl font-bold text-sage-dark">{title}</h1>
          </div>
          <p className="text-sage-gray text-lg">{description}</p>
          <p className="text-sm text-sage-gray mt-2">
            Last updated: {lastUpdated.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {children}

        {/* Footer Navigation */}
        {showNavigation && (
          <div className="flex flex-wrap gap-4 justify-center pt-8 border-t mt-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sage-green hover:text-sage-green-hover transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/dashboard" className="text-sage-green hover:text-sage-green-hover">
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}