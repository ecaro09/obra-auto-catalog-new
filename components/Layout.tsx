import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, ShieldCheck } from 'lucide-react';
import { useCart } from '../App';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { items } = useCart();
  const location = useLocation();
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin && !location.pathname.includes('/login')) {
      // Admin layout handles its own structure usually, but for simplicity reusing parts
      return <div className="min-h-screen bg-gray-100">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-tight text-primary">OBRA</span>
                <span className="text-[0.6rem] uppercase tracking-widest text-secondary -mt-1">Office Furniture</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-600 hover:text-accent font-medium transition">Catalog</Link>
              <Link to="/about" className="text-gray-600 hover:text-accent font-medium transition">About</Link>
              <Link to="/contact" className="text-gray-600 hover:text-accent font-medium transition">Contact</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-accent transition">
                <ShoppingCart className="h-6 w-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-accent rounded-full">
                    {totalItems}
                  </span>
                )}
              </Link>
              <div className="md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600">
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 rounded-md">Catalog</Link>
              <Link to="/cart" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 rounded-md">Cart ({totalItems})</Link>
              <Link to="/admin" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 rounded-md flex items-center gap-2">
                <ShieldCheck size={16} /> Admin Access
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="font-serif text-xl font-bold">OBRA</span>
            <p className="mt-4 text-gray-300 text-sm">
              Providing high-quality office furniture solutions for modern businesses. Executive tables, ergonomic chairs, and modular workstations.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <p className="text-gray-300 text-sm">Viber: +63 915 743 9188</p>
            <p className="text-gray-300 text-sm">Email: obrafurniture@gmail.com</p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Admin</h3>
            <Link to="/admin" className="text-gray-300 hover:text-white text-sm underline decoration-gray-500 underline-offset-4">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
