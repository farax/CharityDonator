import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import aafiyaaLogo from "@assets/aafiyaa-logo.png";
import { cn } from "@/lib/utils";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if we are on the home page
  const [isOnHomePage] = useRoute("/");

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
    window.addEventListener("scroll", handleScroll);

    // Cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [isOnHomePage]);

  const toggleMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  return (
    <header className={cn(
      "bg-white shadow-md sticky top-0 z-50 transition-all duration-300",
      scrolled ? "py-0" : "py-1" // Reduced padding to accommodate bigger logo
    )}>
      <div className="container mx-auto px-0 sm:px-1 lg:px-2"> {/* Reduced container padding */}
        <div className={cn(
          "flex justify-between items-center transition-all duration-300",
          scrolled ? "py-1" : "py-2" // Reduced padding to accommodate bigger logo
        )}>
          <div className={cn(
            "flex items-center transition-all duration-500 ease-in-out",
            isLoaded ? "-ml-5" : "-ml-[50px] opacity-0", // More negative margin to position further left
            scrolled ? "scale-95" : "scale-100" // Subtle scaling effect on scroll
          )}>
            <Link href="/" className="flex items-center space-x-3">
              <img
                src={aafiyaaLogo}
                alt="Aafiyaa Charity Clinics Logo"
                className={cn(
                  "transition-all duration-300 transform",
                  scrolled ? "h-[90px]" : "h-[105px]" // 50% bigger (from 70px to 105px)
                )} 
              />
              <div className={cn(
                "transition-all duration-300",
                scrolled ? "scale-95" : "scale-100"
              )}>
                <h1 className={cn(
                  "font-bold text-primary transition-all duration-300",
                  scrolled ? "text-xl" : "text-2xl"
                )}>
                  Aafiyaa Charity Clinics
                </h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-teal-600 transition-colors text-sm font-medium"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-teal-600 transition-colors text-sm font-medium"
            >
              About Us
            </Link>
            <Link
              href="/active-cases"
              className="text-gray-700 hover:text-teal-600 transition-colors text-sm font-medium"
            >
              Active Cases
            </Link>
            <Link
              href="/get-involved"
              className="text-gray-700 hover:text-teal-600 transition-colors text-sm font-medium"
            >
              Get Involved
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-teal-600 transition-colors text-sm font-medium"
            >
              Contact Us
            </Link>
            <Link href="/payment">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 text-sm">
                Donate Now
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-gray-600 hover:text-teal-600 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-teal-600 transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-teal-600 transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link
                href="/active-cases"
                className="text-gray-700 hover:text-teal-600 transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Active Cases
              </Link>
              <Link
                href="/get-involved"
                className="text-gray-700 hover:text-teal-600 transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Involved
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-teal-600 transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
              <div className="px-4">
                <Link href="/payment" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                    Donate Now
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}