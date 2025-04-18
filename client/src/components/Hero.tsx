import { ReactNode, useState, useEffect } from 'react';

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Images for the carousel (updated collection)
  const images = [
    '/images/clinic_patient_care.jpeg',
    '/images/medical_team.jpeg',
    '/images/charity_clinic.png'
  ];

  useEffect(() => {
    // Set up image rotation timer
    const timer = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds
    
    return () => clearInterval(timer); // Clean up on unmount
  }, [images.length]);

  return (
    <section className="relative">
      {/* Background Image Carousel */}
      <div className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-gray-900">
        {/* Image Carousel */}
        {images.map((image, index) => (
          <div 
            key={index}
            className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
            style={{ 
              backgroundImage: `url(${image})`,
              opacity: currentImageIndex === index ? 0.8 : 0,
              zIndex: 10
            }}
          />
        ))}
        
        {/* Gradient overlay to improve text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/30 to-gray-900/70 z-20"></div>
        
        {/* Hero text content */}
        <div className="absolute top-0 left-0 w-full pt-8 px-4 md:pt-16 md:px-8 lg:pt-20 max-w-4xl z-30">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Providing Medical Care To Those Who Need It Most
          </h1>
          <p className="mt-4 text-xl text-white opacity-90 max-w-2xl">
            Your donation directly impacts lives by providing essential medical services to underserved communities worldwide.
          </p>
        </div>
      </div>

      {/* Render the children (donation widget) with a negative margin to slightly overlap */}
      <div className="relative z-40 -mt-12 md:-mt-16 lg:-mt-20">
        {children}
      </div>
    </section>
  );
}
