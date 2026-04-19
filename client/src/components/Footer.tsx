import { Link } from 'wouter';
import { Heart, MapPin, Mail, Phone, Facebook, Twitter, Instagram, Linkedin, X } from 'lucide-react';
import aafiyaaLogo from '@assets/Gemini_Generated_Image_k78z1bk78z1bk78z_1776588506892.png';
import additionalLogo from '@assets/WhatsApp Image 2025-06-17 at 21.06.34_1750160957596.jpeg';
import { useState } from 'react';

export default function Footer() {
  const [showAcncModal, setShowAcncModal] = useState(false);
  
  return (
    <>
      <footer className="pt-12 pb-6" style={{ backgroundColor: '#1C3D28', color: '#F5EDD6' }}>
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 items-start">
          {/* Organization Info */}
          <div>
            <div className="flex items-center mb-4">
              <img src={aafiyaaLogo} alt="Aafiyaa Charity Clinics Logo" className="h-20 w-20 rounded-full object-cover shadow-md" />
            </div>
            <p className="mb-4 text-sm" style={{ color: 'rgba(245,237,214,0.7)' }}>
              Aafiyaa Charity Clinics provides essential medical services to those in need worldwide through your generous donations.
            </p>
            <div className="flex space-x-4">
              {[
                { href: 'https://www.facebook.com/profile.php?id=61574053173620', Icon: Facebook },
                { href: '#', Icon: Twitter },
                { href: '#', Icon: Instagram },
                { href: '#', Icon: Linkedin },
              ].map(({ href, Icon }, i) => (
                <a
                  key={i}
                  href={href}
                  target={href !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: 'rgba(245,237,214,0.6)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#C8A850')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,237,214,0.6)')}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5EDD6' }}>Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/get-involved', label: 'Get Involved' },
                { href: '/active-cases', label: 'Active Cases' },
                { href: '/about', label: 'About Us' },
              ].map(({ href, label }) => (
                <li key={href + label}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: 'rgba(245,237,214,0.7)' }}
                    onMouseEnter={(e: any) => (e.currentTarget.style.color = '#C8A850')}
                    onMouseLeave={(e: any) => (e.currentTarget.style.color = 'rgba(245,237,214,0.7)')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5EDD6' }}>Get Involved</h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Donate Now' },
                { href: '/get-involved', label: 'Volunteer' },
                { href: '/sponsor', label: 'Sponsor a Case' },
                { href: '/events', label: 'Events' },
              ].map(({ href, label }) => (
                <li key={href + label}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: 'rgba(245,237,214,0.7)' }}
                    onMouseEnter={(e: any) => (e.currentTarget.style.color = '#C8A850')}
                    onMouseLeave={(e: any) => (e.currentTarget.style.color = 'rgba(245,237,214,0.7)')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5EDD6' }}>Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <MapPin className="h-4 w-4 mr-3 flex-shrink-0" style={{ color: '#C8A850' }} />
                <span className="text-sm" style={{ color: 'rgba(245,237,214,0.7)' }}>Australia & Pakistan</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-3 flex-shrink-0" style={{ color: '#C8A850' }} />
                <span className="text-sm" style={{ color: 'rgba(245,237,214,0.7)' }}>info@aafiyaa.org</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-3 flex-shrink-0" style={{ color: '#C8A850' }} />
                <span className="text-sm" style={{ color: 'rgba(245,237,214,0.7)' }}>+61 (04) 1234 5678</span>
              </li>
            </ul>
          </div>

          {/* ACNC Registration */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5EDD6' }}>Registered Charity</h3>
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-4 mb-3">
                <div 
                  className="cursor-pointer transition-transform duration-300 hover:scale-105 group"
                  onClick={() => setShowAcncModal(true)}
                >
                  <img 
                    src="/images/ACNC-Registered-Charity-Logo_RGB.png" 
                    alt="ACNC Registered Charity" 
                    className="h-20 w-20 md:h-24 md:w-24 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    style={{ '--tw-ring-color': 'rgba(200,168,80,0.5)' } as any}
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
              <p className="text-sm font-medium" style={{ color: 'rgba(245,237,214,0.7)' }}>
                Click ACNC logo to expand
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(245,237,214,0.5)' }}>
                Officially Registered & Certified
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Section */}
        <div
          className="container mx-auto px-4 mt-8 pt-6 border-t"
          style={{ borderColor: 'rgba(200,168,80,0.2)' }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm" style={{ color: 'rgba(245,237,214,0.5)' }}>
              © {new Date().getFullYear()} Aafiyaa Charity Clinics. All rights reserved.
            </p>
            <ul className="flex space-x-4 text-sm mt-4 md:mt-0">
              {[
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Service' },
                { href: '/donation-policy', label: 'Donation Policy' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors"
                    style={{ color: 'rgba(245,237,214,0.5)' }}
                    onMouseEnter={(e: any) => (e.currentTarget.style.color = '#C8A850')}
                    onMouseLeave={(e: any) => (e.currentTarget.style.color = 'rgba(245,237,214,0.5)')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
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
                <p className="text-lg font-semibold text-center" style={{ color: '#2D5A3D' }}>
                  Australian Charities and Not-for-profits Commission
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Charity Registration Details:</h3>
                  <ul className="space-y-1 text-sm">
                    <li><strong>Organization:</strong> Aafiyaa Charity Clinics</li>
                    <li><strong>Status:</strong> Registered Charity</li>
                    <li><strong>Registry:</strong> Australian Charities and Not-for-profits Commission (ACNC)</li>
                    <li><strong>Website:</strong> <a href="https://acnc.gov.au/charityregister" target="_blank" rel="noopener noreferrer" style={{ color: '#2D5A3D' }} className="hover:underline">acnc.gov.au/charityregister</a></li>
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
                    className="text-white px-6 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#2D5A3D' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1C3D28')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2D5A3D')}
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
