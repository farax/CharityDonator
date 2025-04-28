import { useState, useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import aafiyaaLogo from '@assets/aafiyaa-logo.png';
import { cn } from '@/lib/utils';


export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if we're on the home page
  const [isOnHomePage] = useRoute('/');
  
  // Effect to track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 10); // Add scrolled class after 10px of scrolling
    };
    
    // Set initial states
    setIsHome(isOnHomePage);
    
    // Add a slight delay for the initial animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [isOnHomePage]);

  const toggleMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  return (
    <header className={cn(
      "bg-white shadow-md sticky top-0 z-50 transition-all duration-300",
      scrolled ? "py-1" : "py-2" // Original header padding
    )}>
      <div className="container mx-auto px-0 sm:px-1 lg:px-2"> {/* Reduced container padding */}
        <div className={cn(
          "flex justify-between items-center transition-all duration-300",
          scrolled ? "py-2" : "py-3" // Original header padding
        )}>
          <div className={cn(
            "flex items-center transition-all duration-500 ease-in-out",
            isLoaded ? "-ml-5" : "-ml-[50px] opacity-0", // More negative margin to position further left
            scrolled ? "scale-95" : "scale-100" // Subtle scaling effect on scroll
          )}>
            <Link href="/" className="flex items-center">
              <img 
                src={aafiyaaLogo} 
                alt="Aafiyaa Charity Clinics Logo" 
                className={cn(
                  "transition-all duration-300 transform",
                  scrolled ? "h-[90px]" : "h-[105px]" // 50% bigger (from 70px to 105px)
                )} 
              />
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
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Desktop Navigation */}

          <nav className={cn(
            "hidden md:flex space-x-8 transition-all duration-500 ease-in-out", // Original spacing and font size
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-10px]" // Fade in from top
          )}>
            <Link href="/" className={cn(
              "font-medium hover:text-primary relative transition-all duration-300", // Original font size
              isOnHomePage ? "text-primary" : "text-gray-800",
              {
                "after:content-[''] after:block after:w-full after:h-0.5 after:bg-primary after:absolute after:-bottom-1 after:scale-x-100 after:transition-transform": isOnHomePage
              }
            )}>
              Home
            </Link>
            <Link href="/about" className="font-medium text-gray-600 hover:text-primary transition-colors duration-300 relative hover:after:scale-x-100 after:content-[''] after:block after:w-full after:h-0.5 after:bg-primary after:absolute after:-bottom-1 after:scale-x-0 after:transition-transform">
              About Us
            </Link>
            <Link href="/active-cases" className="font-medium text-gray-600 hover:text-primary transition-colors duration-300 relative hover:after:scale-x-100 after:content-[''] after:block after:w-full after:h-0.5 after:bg-primary after:absolute after:-bottom-1 after:scale-x-0 after:transition-transform">
              Active Cases
            </Link>
            <Link href="/get-involved" className="font-medium text-gray-600 hover:text-primary transition-colors duration-300 relative hover:after:scale-x-100 after:content-[''] after:block after:w-full after:h-0.5 after:bg-primary after:absolute after:-bottom-1 after:scale-x-0 after:transition-transform">
              Get Involved
            </Link>
            <Link href="/contact" className="font-medium text-gray-600 hover:text-primary transition-colors duration-300 relative hover:after:scale-x-100 after:content-[''] after:block after:w-full after:h-0.5 after:bg-primary after:absolute after:-bottom-1 after:scale-x-0 after:transition-transform">
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
