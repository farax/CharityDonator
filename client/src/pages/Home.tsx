import Header from '@/components/Header';
import Hero from '@/components/Hero';
import DonationWidget from '@/components/DonationWidget';
import CounterWidgets from '@/components/CounterWidgets';
import EndorsementsTicker from '@/components/EndorsementsTicker';
import VideoTestimonials from '@/components/VideoTestimonials';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero>
          <DonationWidget />
        </Hero>
        <CounterWidgets />
        <EndorsementsTicker />
        <VideoTestimonials />
      </main>
      <Footer />
    </div>
  );
}
