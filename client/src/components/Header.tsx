import { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <img src="/images/aafiyaa-logo.svg" alt="Aafiyaa Charity Clinics Logo" className="h-14" />
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="font-medium text-gray-800 hover:text-primary">
              Home
            </Link>
            <Link href="/about" className="font-medium text-gray-600 hover:text-primary">
              About Us
            </Link>
            <Link href="/active-cases" className="font-medium text-gray-600 hover:text-primary">
              Active Cases
            </Link>
            <Link href="/get-involved" className="font-medium text-gray-600 hover:text-primary">
              Get Involved
            </Link>
            <Link href="/contact" className="font-medium text-gray-600 hover:text-primary">
              Contact
            </Link>
            {/* Admin link removed from navigation, accessible directly via URL */}
          </nav>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/" 
                className="font-medium text-gray-800 hover:text-primary" 
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/about" 
                className="font-medium text-gray-600 hover:text-primary" 
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link 
                href="/active-cases" 
                className="font-medium text-gray-600 hover:text-primary" 
                onClick={() => setMobileMenuOpen(false)}
              >
                Active Cases
              </Link>
              <Link 
                href="/get-involved" 
                className="font-medium text-gray-600 hover:text-primary" 
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Involved
              </Link>
              <Link 
                href="/contact" 
                className="font-medium text-gray-600 hover:text-primary" 
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              {/* Admin and Donate buttons removed from mobile menu */}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
