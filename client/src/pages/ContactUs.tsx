import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactFormSchema } from '@shared/schema';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactUs() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Clinic locations
  const clinics = [
    {
      name: "Clinic One",
      address: "Plot 407, Block 4A, Quaid-e-azam colony, Gulshan Iqbal",
      phone: "03432930028",
      email: "info@aafiyaa.com",
      hours: "Mon-Sat: 9:00 AM - 5:00 PM",
      mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3619.145244971144!2d67.09814841443994!3d24.894844984035214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33903d1f8df9d%3A0xfc1abec5a3e9ba80!2sGulshan-e-Iqbal%20Block%204-A%2C%20Gulshan-e-Iqbal%2C%20Karachi%2C%20Karachi%20City%2C%20Sindh%2C%20Pakistan!5e0!3m2!1sen!2sus!4v1681922222222!5m2!1sen!2sus"
    }
  ];
  
  // Form setup
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: ''
    }
  });

  // Form submission handler
  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Send data to the server
      const response = await apiRequest('POST', '/api/contact', data);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit form');
      }
      
      toast({
        title: "Message Sent",
        description: result.message || "Thank you for your message. We'll get back to you soon.",
      });
      
      form.reset();
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          {/* Contact Us Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions or want to learn more about our clinics and services? Reach out to us using any of the methods below.
            </p>
          </div>
          
          {/* Clinic Locations */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Locations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {clinics.map((clinic, index) => (
                <Card key={index} className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>{clinic.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-4 h-56 rounded-md overflow-hidden">
                      <iframe 
                        src={clinic.mapUrl} 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen={false} 
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Map of ${clinic.name}`}
                      ></iframe>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">{clinic.address}</p>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                        <p className="text-gray-700">{clinic.phone}</p>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                        <p className="text-gray-700">{clinic.email}</p>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                        <p className="text-gray-700">{clinic.hours}</p>
                      </div>
                      <div className="pt-2">
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:text-primary/80"
                        >
                          <span>View on Google Maps</span>
                          <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          
          {/* Contact Form */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Send Us a Message</h2>
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Contact Form</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email address" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Subject of your message" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Your message" 
                              className="min-h-[120px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-teal-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}