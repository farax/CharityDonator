import { ReactNode, useState, useEffect } from 'react';

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = [
    '/images/clinic_patient_care.jpeg',
    '/images/medical_team.jpeg',
    '/images/charity_clinic.png'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section className="relative">
      {/* Background Image Carousel */}
      <div className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden" style={{ backgroundColor: '#1C3D28' }}>
        {images.map((image, index) => (
          <div 
            key={index}
            className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
            style={{ 
              backgroundImage: `url(${image})`,
              opacity: currentImageIndex === index ? 0.7 : 0,
              zIndex: 10
            }}
          />
        ))}
        
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-20"
          style={{ background: 'linear-gradient(to bottom, rgba(28,61,40,0.75) 0%, rgba(28,61,40,0.3) 50%, rgba(28,61,40,0.75) 100%)' }}
        />
        
        {/* Hero text content */}
        <div className="absolute top-0 left-0 w-full pt-8 px-4 md:pt-16 md:px-8 lg:pt-20 max-w-4xl z-30">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
            style={{ color: '#F5EDD6' }}
          >
            Providing Medical Care To Those Who Need It Most
          </h1>
          <p
            className="mt-4 text-xl max-w-2xl"
            style={{ color: 'rgba(245,237,214,0.80)' }}
          >
            Your donation directly impacts lives by providing essential medical services to underserved communities worldwide.
          </p>
        </div>
      </div>

      {/* Children (donation widget) overlap */}
      <div className="relative z-40 -mt-12 md:-mt-16 lg:-mt-20">
        {children}
      </div>
    </section>
  );
}
