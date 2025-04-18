import { ReactNode } from 'react';

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  return (
    <section className="relative">
      {/* Background Image */}
      <div className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-gray-900">
        {/* Medical hero image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80)'
          }}
        />
        
        {/* Gradient overlay to improve text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/40 to-gray-900/70"></div>
        
        {/* Hero text content */}
        <div className="absolute top-0 left-0 w-full pt-8 px-4 md:pt-16 md:px-8 lg:pt-20 max-w-4xl">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Providing Medical Care To Those Who Need It Most
          </h1>
          <p className="mt-4 text-xl text-white opacity-90 max-w-2xl">
            Your donation directly impacts lives by providing essential medical services to underserved communities worldwide.
          </p>
        </div>
      </div>

      {/* Render the children (donation widget) with a negative margin to slightly overlap */}
      <div className="relative z-10 -mt-12 md:-mt-16 lg:-mt-20">
        {children}
      </div>
    </section>
  );
}
