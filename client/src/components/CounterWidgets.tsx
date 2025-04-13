import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { User, CalendarCheck } from 'lucide-react';
import { Stats } from '@shared/schema';

export default function CounterWidgets() {
  const [totalPatients, setTotalPatients] = useState(0);
  const [monthlyPatients, setMonthlyPatients] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  const { data: stats } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  useEffect(() => {
    if (stats && !animationComplete) {
      animateCounter(0, stats.totalPatients, 2000, setTotalPatients);
      animateCounter(0, stats.monthlyPatients, 2000, setMonthlyPatients);
      setAnimationComplete(true);
    }
  }, [stats, animationComplete]);

  const animateCounter = (
    start: number, 
    end: number, 
    duration: number, 
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setter(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-3">Our Impact</h2>
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          Your generosity has helped us make a real difference in people's lives
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Total Patients Counter */}
          <Card className="bg-white rounded-lg shadow-md">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="inline-block p-3 rounded-full bg-blue-100 text-primary mb-4">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Total Patients Served</h3>
              <p className="text-4xl md:text-5xl font-bold text-primary counter-number">
                {totalPatients.toLocaleString()}
              </p>
              <p className="text-gray-600 mt-2">Lives impacted worldwide</p>
            </CardContent>
          </Card>
          
          {/* This Month Counter */}
          <Card className="bg-white rounded-lg shadow-md">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="inline-block p-3 rounded-full bg-green-100 text-green-600 mb-4">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Patients Served This Month</h3>
              <p className="text-4xl md:text-5xl font-bold text-green-600 counter-number">
                {monthlyPatients.toLocaleString()}
              </p>
              <p className="text-gray-600 mt-2">And counting this month</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
