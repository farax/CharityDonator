import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Endorsement } from '@shared/schema';
import { Building2, Stethoscope, Globe, HeartPulse, Baby, BookOpen, Activity } from 'lucide-react';

// Import the partner logos
import rahbarLogo from '../assets/rahbar-logo.png';
import alIhsanLogo from '../assets/al-ihsan-logo.png';

export default function EndorsementsTicker() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const { data: endorsements } = useQuery<Endorsement[]>({
    queryKey: ['/api/endorsements'],
  });

  // Handle auto-scrolling
  useEffect(() => {
    if (!endorsements || !isScrolling || !scrollerRef.current) return;

    let scrollPosition = 0;
    const scrollWidth = scrollerRef.current.scrollWidth;
    const containerWidth = scrollerRef.current.offsetWidth;

    // Duplicate items once we know the width
    if (scrollWidth > 0 && containerWidth > 0 && !isDuplicating) {
      setIsDuplicating(true);
    }

    const scrollInterval = setInterval(() => {
      if (!scrollerRef.current) return;
      
      scrollPosition += 1;
      if (scrollPosition >= scrollWidth / 2) {
        scrollPosition = 0;
      }
      
      scrollerRef.current.style.transform = `translateX(-${scrollPosition}px)`;
    }, 20);

    return () => {
      clearInterval(scrollInterval);
    };
  }, [endorsements, isScrolling, isDuplicating]);

  // Pause scrolling on hover
  const handleMouseEnter = () => setIsScrolling(false);
  const handleMouseLeave = () => setIsScrolling(true);

  // Get the appropriate icon based on the endorsement logo URL
  const getEndorsementIcon = (logoUrl: string) => {
    switch (logoUrl) {
      case 'who':
        return <Globe className="w-12 h-12 text-blue-700" />;
      case 'redcross':
        return <HeartPulse className="w-12 h-12 text-red-600" />;
      case 'unicef':
        return <Baby className="w-12 h-12 text-blue-500" />;
      case 'gates':
        return <Building2 className="w-12 h-12 text-gray-800" />;
      case 'rahbar-trust':
        return <img src={rahbarLogo} alt="Rahbar Foundation" className="w-16 h-16 object-contain" />;
      case 'al-ihsan':
        return <img src={alIhsanLogo} alt="Al-Ihsan Institute" className="w-24 h-12 object-contain" />;
      case 'dwb':
        return <Activity className="w-12 h-12 text-red-700" />;
      default:
        return <Stethoscope className="w-12 h-12 text-green-600" />;
    }
  };

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-3">Trusted Partners</h2>
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          We're proud to work with these organizations to extend our reach
        </p>
        
        <div 
          className="endorsements-ticker relative overflow-hidden py-8" 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div 
            ref={scrollerRef}
            className="ticker-wrapper flex items-center space-x-12"
          >
            {endorsements?.map((endorsement) => (
              <a 
                href={endorsement.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                key={endorsement.id}
                className="no-underline"
              >
                <Card className="flex items-center bg-white rounded-lg shadow-sm min-w-[240px] hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-4 flex items-center">
                    {getEndorsementIcon(endorsement.logoUrl)}
                    <div className="ml-4">
                      <p className="font-semibold text-gray-800">{endorsement.name}</p>
                      <p className="text-xs text-gray-500">{endorsement.type}</p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
            
            {/* Duplicate items for continuous scrolling */}
            {isDuplicating && endorsements?.map((endorsement) => (
              <a 
                href={endorsement.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                key={`dup-${endorsement.id}`}
                className="no-underline"
              >
                <Card className="flex items-center bg-white rounded-lg shadow-sm min-w-[240px] hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-4 flex items-center">
                    {getEndorsementIcon(endorsement.logoUrl)}
                    <div className="ml-4">
                      <p className="font-semibold text-gray-800">{endorsement.name}</p>
                      <p className="text-xs text-gray-500">{endorsement.type}</p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
