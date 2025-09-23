import { Link } from 'wouter';
import { Heart, MapPin, Mail, Phone, Facebook, Twitter, Instagram, Linkedin, X } from 'lucide-react';
import aafiyaaLogo from '@assets/aafiyaa-logo.png';
import additionalLogo from '@assets/WhatsApp Image 2025-06-17 at 21.06.34_1750160957596.jpeg';
import { useState } from 'react';

export default function Footer() {
  const [showAcncModal, setShowAcncModal] = useState(false);
  
  return (
    <>
      <footer className="bg-gray-800 text-white pt-12 pb-6">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 items-start">
          {/* Organization Info */}
          <div>
            <div className="flex items-center mb-4">
              <img src={aafiyaaLogo} alt="Aafiyaa Charity Clinics Logo" className="h-20 filter brightness-0 invert" />
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
                <Link href="/get-involved" className="text-gray-300 hover:text-white">
                  Get Involved
                </Link>
              </li>
              <li>
                <Link href="/active-cases" className="text-gray-300 hover:text-white">
                  Active Cases
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Get Involved</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white">
                  Donate Now
                </Link>
              </li>
              <li>
                <Link href="/get-involved" className="text-gray-300 hover:text-white">
                  Volunteer
                </Link>
              </li>
              <li>
                <Link href="/sponsor" className="text-gray-300 hover:text-white">
                  Sponsor a Case
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-gray-300 hover:text-white">
                  Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <MapPin className="h-4 w-4 mr-3 text-teal-400" />
                <span className="text-gray-300">Australia & Pakistan</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-3 text-teal-400" />
                <span className="text-gray-300">info@aafiyaa.org</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-teal-400" />
                <span className="text-gray-300">+61 (04) 1234 5678</span>
              </li>
            </ul>
          </div>

          {/* ACNC Registration - Prominent Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Registered Charity</h3>
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-4 mb-3">
                <div 
                  className="cursor-pointer transition-transform duration-300 hover:scale-105 group"
                  onClick={() => setShowAcncModal(true)}
                >
                  <img 
                    src="/images/ACNC-Registered-Charity-Logo_RGB.png" 
                    alt="ACNC Registered Charity" 
                    className="h-20 w-20 md:h-24 md:w-24 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group-hover:ring-4 group-hover:ring-teal-400/50"
                  />
                </div>
                <div className="transition-transform duration-300 hover:scale-105">
                  <img 
                    src={additionalLogo} 
                    alt="Additional Certification" 
                    className="h-20 w-20 md:h-24 md:w-24 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  />
                </div>
              </div>
              <p className="text-gray-300 text-sm font-medium">
                Click ACNC logo to expand
              </p>
              <p className="text-gray-400 text-xs">
                Officially Registered & Certified
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Section */}
        <div className="container mx-auto px-4 mt-8 pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Aafiyaa Charity Clinics. All rights reserved.</p>
            </div>
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

      {/* ACNC Modal */}
      {showAcncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">ACNC Registered Charity</h2>
                <button
                  onClick={() => setShowAcncModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="text-center mb-6">
                <img 
                  src="/images/ACNC-Registered-Charity-Logo_RGB.png" 
                  alt="ACNC Registered Charity Logo" 
                  className="h-48 w-48 mx-auto rounded-full shadow-lg"
                />
              </div>
              
              <div className="space-y-4 text-gray-700">
                <p className="text-lg font-semibold text-center text-teal-600">
                  Australian Charities and Not-for-profits Commission
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Charity Registration Details:</h3>
                  <ul className="space-y-1 text-sm">
                    <li><strong>Organization:</strong> Aafiyaa Charity Clinics</li>
                    <li><strong>Status:</strong> Registered Charity</li>
                    <li><strong>Registry:</strong> Australian Charities and Not-for-profits Commission (ACNC)</li>
                    <li><strong>Website:</strong> <a href="https://acnc.gov.au/charityregister" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">acnc.gov.au/charityregister</a></li>
                  </ul>
                </div>
                
                <p className="text-sm text-gray-600">
                  This logo confirms that Aafiyaa Charity Clinics is officially registered with the ACNC, 
                  Australia's national regulator of charities. Your donations are tax-deductible and 
                  support legitimate charitable activities.
                </p>
                
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setShowAcncModal(false)}
                    className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}