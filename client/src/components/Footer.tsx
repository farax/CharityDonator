import { Link } from 'wouter';
import { Heart, MapPin, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import aafiyaaLogo from '@assets/aafiyaa-logo.png';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white pt-12 pb-6">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Organization Info */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <img src={aafiyaaLogo} alt="Aafiyaa Charity Clinics Logo" className="h-16 mb-2 filter brightness-0 invert" />
          </div>
          <p className="text-gray-300 mb-4">
            Aafiyaa Charity Clinics provides essential medical services to those in need worldwide through your generous donations.
          </p>
          <div className="flex space-x-4">
            <a 
              href="https://www.facebook.com/profile.php?id=61574053173620" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-300 hover:text-white"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-300 hover:text-white">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-300 hover:text-white">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-300 hover:text-white">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
        
        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/" className="text-gray-300 hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-gray-300 hover:text-white">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/active-cases" className="text-gray-300 hover:text-white">
                Active Cases
              </Link>
            </li>
            <li>
              <Link href="/get-involved" className="text-gray-300 hover:text-white">
                Get Involved
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-gray-300 hover:text-white">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Programs */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Our Programs</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/programs/emergency" className="text-gray-300 hover:text-white">
                Emergency Response
              </Link>
            </li>
            <li>
              <Link href="/programs/clinics" className="text-gray-300 hover:text-white">
                Medical Clinics
              </Link>
            </li>
            <li>
              <Link href="/programs/maternal" className="text-gray-300 hover:text-white">
                Maternal Health
              </Link>
            </li>
            <li>
              <Link href="/programs/vaccination" className="text-gray-300 hover:text-white">
                Child Vaccination
              </Link>
            </li>
            <li>
              <Link href="/programs/training" className="text-gray-300 hover:text-white">
                Medical Training
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <MapPin className="h-5 w-5 mt-1 mr-2 text-gray-400" />
              <span className="text-gray-300">123 Healing Street, City, Country</span>
            </li>
            <li className="flex items-start">
              <Mail className="h-5 w-5 mt-1 mr-2 text-gray-400" />
              <span className="text-gray-300">info@aafiyaaclinics.org</span>
            </li>
            <li className="flex items-start">
              <Phone className="h-5 w-5 mt-1 mr-2 text-gray-400" />
              <span className="text-gray-300">+1 (123) 456-7890</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="container mx-auto px-4 mt-8 pt-6 border-t border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Aafiyaa Charity Clinics. All rights reserved.</p>
          <div className="mt-4 md:mt-0">
            <ul className="flex space-x-4 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/donation-policy" className="text-gray-400 hover:text-white">
                  Donation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
