"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { 
  TrendingUp, 
  LayoutDashboard, 
  BarChart3, 
  Building2, 
  Layers, 
  FileText, 
  Lightbulb, 
  Settings, 
  User,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Financial Reports", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Companies", href: "/dashboard/entities", icon: Building2 },
  { name: "Dimensions", href: "/dashboard/dimensions", icon: Layers },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "AI Insights", href: "/dashboard/chat", icon: Lightbulb },
  { name: "Setup", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <TrendingUp className="h-8 w-8 text-sage-green" />
          <span className="text-xl font-bold text-sage-dark">FinHelm</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-sage-green text-white'
                    : 'text-sage-gray hover:bg-gray-100 hover:text-sage-dark'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sage-dark truncate">
                {user?.firstName || user?.username || "Dashboard User"}
              </p>
              <p className="text-xs text-sage-gray truncate">
                Financial Analyst
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-sage-dark">
                {navigation.find(item => pathname === item.href)?.name || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}