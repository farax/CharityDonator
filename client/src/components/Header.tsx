import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import aafiyaaLogo from "../assets/aafiyaa-logo.png";
import { cn } from "@/lib/utils";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isOnHomePage] = useRoute("/");

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 10);
    };

    setIsHome(isOnHomePage);

    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [isOnHomePage]);

  const toggleMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 border-b",
        scrolled ? "py-0" : "py-1"
      )}
      style={{ backgroundColor: '#FDFAF3', borderBottomColor: '#E0D0A0' }}
    >
      <div className="container mx-auto px-4 sm:px-1 lg:px-2">
        <div className={cn(
          "flex justify-between items-center transition-all duration-300",
          scrolled ? "py-1" : "py-2"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-500 ease-in-out",
            isLoaded ? "ml-0 sm:-ml-5" : "-ml-[50px] opacity-0",
            scrolled ? "scale-95" : "scale-100"
          )}>
            <Link href="/" className="flex items-center group">
              <img
                src={aafiyaaLogo}
                alt="Aafiyaa Charity Clinics Logo"
                className={cn(
                  "transition-all duration-300 mr-4 rounded-full object-cover",
                  scrolled ? "h-[68px] w-[68px]" : "h-[80px] w-[80px]"
                )}
              />
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-2">
                  <h1 className={cn(
                    "font-bold tracking-wide transition-all duration-300",
                    scrolled ? "text-lg" : "text-2xl"
                  )} style={{ color: '#2D5A3D' }}>
                    AAFIYAA
                  </h1>
                  <span className={cn(
                    "font-light transition-all duration-300",
                    scrolled ? "text-sm" : "text-lg"
                  )} style={{ color: '#C8A850' }}>
                    Charity Clinics
                  </span>
                </div>
                <div className={cn(
                  "flex items-center space-x-1 transition-all duration-300",
                  scrolled ? "mt-0" : "mt-1"
                )}>
                  <div className="w-8 h-0.5" style={{ background: 'linear-gradient(to right, #2D5A3D, #C8A850)' }}></div>
                  <p className={cn(
                    "font-medium tracking-wider uppercase transition-all duration-300",
                    scrolled ? "text-xs" : "text-xs"
                  )} style={{ color: '#8A7A50' }}>
                    Healthcare & Compassion
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: '/', label: 'Home' },
              { href: '/about', label: 'About Us' },
              { href: '/active-cases', label: 'Active Cases' },
              { href: '/get-involved', label: 'Get Involved' },
              { href: '/contact', label: 'Contact Us' },
            ].map(({ href, label }) => (
              <Link
                key={href + label}
                href={href}
                className="transition-colors text-sm font-medium hover:opacity-70"
                style={{ color: '#2D5A3D' }}
              >
                {label}
              </Link>
            ))}
            <Link href="/">
              <Button
                className="px-6 py-2 text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#2D5A3D', color: '#F5EDD6' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1C3D28')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2D5A3D')}
              >
                Donate Now
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 transition-colors"
            style={{ color: '#2D5A3D' }}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4" style={{ backgroundColor: '#FDFAF3', borderColor: '#E0D0A0' }}>
            <nav className="flex flex-col space-y-4">
              {[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About Us' },
                { href: '/active-cases', label: 'Active Cases' },
                { href: '/get-involved', label: 'Get Involved' },
                { href: '/contact', label: 'Contact Us' },
              ].map(({ href, label }) => (
                <Link
                  key={href + label}
                  href={href}
                  className="transition-colors px-4 py-2 text-sm font-medium"
                  style={{ color: '#2D5A3D' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="px-4">
                <Link href="/payment" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    className="w-full font-semibold"
                    style={{ backgroundColor: '#2D5A3D', color: '#F5EDD6' }}
                  >
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
