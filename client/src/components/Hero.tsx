import { ReactNode, useState, useEffect } from 'react';

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  const [currentImage, setCurrentImage] = useState(0);
  
  // Define the image URLs with fallback
  const images = [
    // Using relative paths to the public directory
    './attached_assets/WhatsApp Image 2025-04-17 at 11.00.25.jpeg',
    './attached_assets/WhatsApp Image 2025-04-17 at 11.00.26.jpeg',
    './attached_assets/b2381923-3686-4c99-a4a2-94c6267fcee0.jpeg'
  ];
  
  useEffect(() => {
    // Image rotation timer
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 6000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative">
      {/* Background Image Carousel */}
      <div className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-gray-900">
        {/* Transitioning images */}
        {images.map((image, index) => (
          <div 
            key={index}
            className="absolute inset-0 w-full h-full object-cover bg-cover bg-center transition-opacity duration-1000 ease-in-out"
            style={{ 
              backgroundImage: `url(${image})`,
              backgroundRepeat: 'no-repeat',
              opacity: currentImage === index ? 0.75 : 0,
              zIndex: currentImage === index ? 10 : 0
            }}
          />
        ))}
        
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-20"></div>
        <div className="absolute top-0 left-0 w-full pt-8 px-4 md:pt-16 md:px-8 lg:pt-20 max-w-4xl z-30">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Providing Medical Care To Those Who Need It Most
          </h1>
          <p className="mt-4 text-xl text-white opacity-90 max-w-2xl">
            Your donation directly impacts lives by providing essential medical services to underserved communities worldwide.
          </p>
        </div>
      </div>

      {/* Render the children (donation widget) */}
      {children}
    </section>
  );
}
