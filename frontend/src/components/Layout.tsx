import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { 
  Ticket, 
  BookOpen, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';
import { Button } from './ui/Button';
import { NotificationBell } from './ui/NotificationBell';

export const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" />;
  }

  const navigation = [
    {
      name: 'Tickets',
      href: '/tickets',
      icon: Ticket,
      show: true,
    },
    {
      name: 'Knowledge Base',
      href: '/kb',
      icon: BookOpen,
      show: user.role === 'admin',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      show: user.role === 'admin',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Smart Helpdesk</h1>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation
              .filter(item => item.show)
              .map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="ml-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top header with notifications */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-end">
            {user.role !== 'admin' && <NotificationBell />}
          </div>
        </header>
        
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};