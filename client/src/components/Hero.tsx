import { ReactNode } from 'react';

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  return (
    <section className="relative">
      {/* Background GIF */}
      <div className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-gray-900">
        <div 
          className="absolute inset-0 w-full h-full object-cover opacity-75 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://cdn.pixabay.com/photo/2018/07/15/10/44/dna-3539309_1280.jpg)',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Using a dynamic background image instead of a GIF for this implementation */}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full pt-8 px-4 md:pt-16 md:px-8 lg:pt-20 max-w-4xl">
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
