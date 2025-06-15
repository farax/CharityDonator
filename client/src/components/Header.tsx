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
      <div className="container mx-auto px-4 sm:px-1 lg:px-2">
        <div className={cn(
          "flex justify-between items-center transition-all duration-300",
          scrolled ? "py-1" : "py-2"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-500 ease-in-out",
            isLoaded ? "ml-0 sm:-ml-5" : "-ml-[50px] opacity-0", // No negative margin on mobile, negative on sm+
            scrolled ? "scale-95" : "scale-100"
          )}>
            <Link href="/" className="flex items-center group">
              <img
                src={aafiyaaLogo}
                alt="Aafiyaa Charity Clinics Logo"
                className={cn(
                  "transition-all duration-300 transform mr-4",
                  scrolled ? "h-[50px]" : "h-[60px]"
                )} 
              />
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-2">
                  <h1 className={cn(
                    "font-bold tracking-wide transition-all duration-300",
                    "bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent",
                    "group-hover:from-teal-700 group-hover:to-emerald-700",
                    scrolled ? "text-lg" : "text-2xl"
                  )}>
                    AAFIYAA
                  </h1>
                  <span className={cn(
                    "font-light text-gray-600 transition-all duration-300",
                    scrolled ? "text-sm" : "text-lg"
                  )}>
                    Charity Clinics
                  </span>
                </div>
                <div className={cn(
                  "flex items-center space-x-1 transition-all duration-300",
                  scrolled ? "mt-0" : "mt-1"
                )}>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                  <p className={cn(
                    "text-gray-500 font-medium tracking-wider uppercase transition-all duration-300",
                    scrolled ? "text-xs" : "text-xs"
                  )}>
                    Healthcare & Compassion
                  </p>
                </div>
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