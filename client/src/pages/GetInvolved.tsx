import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import volunteerPoster from "@assets/volunteer.png";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Clock, 
  UserPlus, 
  CalendarDays, 
  BookOpen, 
  Send 
} from "lucide-react";

export default function GetInvolved() {
  // Define volunteer roles
  const volunteerRoles = [
    {
      title: "Software Engineers",
      icon: <BookOpen className="h-5 w-5" />,
      description: "Help us build websites and automate processes to improve our operations."
    },
    {
      title: "Call Center Operatives",
      icon: <Send className="h-5 w-5" />,
      description: "Reach out to patients and partners to coordinate care and services."
    },
    {
      title: "Medical Evaluation",
      icon: <Heart className="h-5 w-5" />,
      description: "Medical professionals needed to review diagnoses and treatment plans."
    },
    {
      title: "Finance Experts",
      icon: <CalendarDays className="h-5 w-5" />,
      description: "Help maintain financial records and improve financial processes."
    },
    {
      title: "Field Work",
      icon: <UserPlus className="h-5 w-5" />,
      description: "Volunteer at our clinics to provide direct support to medical staff."
    },
    {
      title: "Social Media Support",
      icon: <Clock className="h-5 w-5" />,
      description: "Help us spread awareness about our cause and engage with our community."
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-primary/5 py-12 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get Involved</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              Join us in our mission to provide quality healthcare to those in need. 
              There are many ways to contribute to our cause.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <a href="#volunteer">Volunteer</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/">Donate</Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Volunteer Poster Section */}
        <section id="volunteer" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Volunteer Opportunities</h2>
              <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
                We have various volunteering opportunities available, whether you're a medical professional, 
                tech expert, or simply have time to give.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <img 
                  src={volunteerPoster} 
                  alt="Aafiyaa Clinic Volunteers Needed Poster" 
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-4">How You Can Help</h3>
                <p className="mb-6">
                  Our volunteers are the backbone of our organization. By contributing your time and skills, 
                  you can make a real difference in the lives of those we serve.
                </p>
                
                <div className="grid gap-4">
                  {volunteerRoles.map((role, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {role.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{role.title}</h4>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Ways to Get Involved */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Ways to Get Involved</h2>
              <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
                Whether you can volunteer your time, make a donation, or help spread awareness, 
                there are many ways to support our mission.
              </p>
            </div>
            
            <Tabs defaultValue="volunteer" className="w-full max-w-4xl mx-auto">
              <TabsList className="grid grid-cols-3 mb-8">
                <TabsTrigger value="volunteer">Volunteer</TabsTrigger>
                <TabsTrigger value="donate">Donate</TabsTrigger>
                <TabsTrigger value="advocate">Advocate</TabsTrigger>
              </TabsList>
              
              <TabsContent value="volunteer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Volunteer Your Time</CardTitle>
                    <CardDescription>
                      Dedicate your time and skills to help our clinic operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Volunteering with Aafiyaa Clinic is a rewarding experience that allows you to directly 
                      impact the lives of those in need. We have various opportunities available for both 
                      medical and non-medical volunteers.
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2">
                      <li>Fill out our volunteer application form</li>
                      <li>Specify your skills and availability</li>
                      <li>Attend a brief orientation session</li>
                      <li>Begin making a difference</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Apply to Volunteer</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="donate" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Make a Donation</CardTitle>
                    <CardDescription>
                      Support our work through financial contributions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Your donations help us provide medical care, medications, and support services to 
                      those who would otherwise go without. Every contribution, regardless of size, makes 
                      a significant impact on our ability to serve our community.
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2">
                      <li>One-time or recurring donations</li>
                      <li>Zakaat, Sadqah, and other Islamic charity options</li>
                      <li>Sponsor specific cases or clinic operations</li>
                      <li>Corporate giving and matching programs</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href="/">Donate Now</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="advocate" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Become an Advocate</CardTitle>
                    <CardDescription>
                      Raise awareness about our mission and impact
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Help us spread the word about the important work we're doing. By becoming an advocate, 
                      you can help raise awareness about healthcare disparities and the impact our clinics 
                      have on communities in need.
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2">
                      <li>Share our social media posts</li>
                      <li>Host a fundraising event</li>
                      <li>Speak about our work in your community</li>
                      <li>Join our newsletter and stay informed</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Join Our Network</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
        
        {/* Contact Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
            <p className="text-lg max-w-2xl mx-auto mb-8">
              We'd love to hear from you and discuss how you can get involved.
            </p>
            <Button size="lg" className="mx-auto">Contact Us</Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}