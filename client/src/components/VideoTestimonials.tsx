import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Quote } from 'lucide-react';

interface VideoTestimonial {
  id: string;
  youtubeId: string;
  title: string;
  description?: string;
}

const testimonials: VideoTestimonial[] = [
  {
    id: '1',
    youtubeId: 'zra4zNfvB48',
    title: 'Patient Testimonial',
    description: 'Hear from those whose lives have been changed through your generosity.'
  }
];

export default function VideoTestimonials() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const handlePlayClick = (youtubeId: string) => {
    setActiveVideo(youtubeId);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 text-teal-600 mb-4">
            <Quote className="h-6 w-6" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Stories of Hope
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Real stories from real people whose lives have been transformed by your generous donations
          </p>
        </div>

        <div className="flex justify-center">
          <div className={`
            ${testimonials.length === 1 
              ? 'flex justify-center' 
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'
            } max-w-5xl w-full
          `}>
            {testimonials.map((testimonial) => (
              <div 
                key={testimonial.id} 
                className={`
                  overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300
                  ${testimonials.length === 1 ? 'w-72' : ''}
                `}
                data-testid={`video-testimonial-${testimonial.id}`}
              >
                <div className="relative aspect-[9/16] bg-gray-900">
                  {activeVideo === testimonial.youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${testimonial.youtubeId}?autoplay=1&rel=0`}
                      title={testimonial.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  ) : (
                    <div 
                      className="absolute inset-0 cursor-pointer group"
                      onClick={() => handlePlayClick(testimonial.youtubeId)}
                      data-testid={`play-button-${testimonial.id}`}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${testimonial.youtubeId}/maxresdefault.jpg`}
                        alt={testimonial.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${testimonial.youtubeId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-teal-600 group-hover:bg-teal-500 transition-colors duration-300 flex items-center justify-center shadow-lg">
                          <Play className="h-7 w-7 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white p-3">
                  <h3 className="font-semibold text-gray-800 text-sm">{testimonial.title}</h3>
                  {testimonial.description && (
                    <p className="text-xs text-gray-600 mt-1">{testimonial.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
