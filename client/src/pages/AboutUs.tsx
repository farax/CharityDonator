import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AboutUs() {
  // Medical staff data
  const medicalStaff = [
    {
      name: "Dr. Javeria Khan",
      role: "General Practitioner",
      bio: "Dr. Javeria Khan brings a wealth of experience in general medicine, with a special focus on providing accessible healthcare to underserved communities. She is dedicated to treating patients with compassion and ensuring everyone receives quality care regardless of their background.",
      image: "/images/team/doctor.jpg",
      initials: "JK"
    }
  ];
  
  // Admin staff data
  const adminStaff = [
    {
      name: "Nida",
      role: "Dispenser",
      bio: "Nida manages our pharmacy operations with precision and care. She ensures that all medications are properly organized, tracked, and dispensed to patients according to their prescriptions.",
      image: "/images/team/admin1.jpg",
      initials: "N"
    },
    {
      name: "Babu Khan",
      role: "Clinic Manager",
      bio: "Babu Khan oversees the day-to-day operations of our clinic, ensuring that everything runs smoothly from patient scheduling to facility maintenance. His organizational skills and attention to detail help create a welcoming environment for both patients and staff.",
      image: "/images/team/admin2.jpg",
      initials: "BK"
    }
  ];

  // Board members data
  const boardMembers = [
    {
      name: "Faraz Ahmed",
      role: "Director",
      bio: "Faraz Ahmed brings strategic vision and leadership to Aafiyaa Charity Clinics, guiding our organization toward sustainable growth and impact in healthcare delivery.",
      image: "/images/board/director1.jpg",
      initials: "FA"
    },
    {
      name: "Raihan Siddik",
      role: "Director",
      bio: "With a background in community health initiatives, Raihan Siddik contributes valuable insights on expanding our reach to underserved populations and improving health outcomes.",
      image: "/images/board/director2.jpg",
      initials: "RS"
    },
    {
      name: "Muhammad Wahaj Shamim",
      role: "Director",
      bio: "Muhammad Wahaj Shamim leverages his expertise in healthcare management to enhance our clinic operations and ensure efficient delivery of medical services to those in need.",
      image: "/images/board/director3.jpg",
      initials: "MWS"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          {/* About Us Section */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">About Aafiyaa Charity Clinics</h1>
              <div className="max-w-3xl mx-auto">
                <p className="text-lg text-gray-700 mb-6">
                  Founded in 2024, Aafiyaa Charity Clinics is dedicated to providing essential medical care to underserved and vulnerable communities around the world.
                </p>
                <p className="text-lg text-gray-700 mb-6">
                  Our mission is to ensure that quality healthcare is accessible to all, regardless of their economic situation or geographic location. We operate permanent and mobile clinics in areas with limited access to healthcare services.
                </p>
                <p className="text-lg text-gray-700">
                  Through a combination of dedicated professionals and generous donors, we have served over 120,000 patients and continue to expand our reach to more communities in need.
                </p>
              </div>
            </div>
          </section>

          {/* Our Values Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Compassion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    We believe in treating every patient with dignity, respect, and empathy, recognizing their unique needs and circumstances.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Excellence</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    We are committed to providing the highest quality of medical care possible, even in challenging environments.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    We focus on building long-term solutions that empower communities to maintain their health and wellbeing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Medical Staff Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Medical Staff</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {medicalStaff.map((member, index) => (
                <Card key={index} className="h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.image} alt={member.name} />
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{member.name}</CardTitle>
                      <CardDescription>{member.role}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-gray-700">{member.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          
          {/* Admin Staff Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Admin Staff</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adminStaff.map((member, index) => (
                <Card key={index} className="h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.image} alt={member.name} />
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{member.name}</CardTitle>
                      <CardDescription>{member.role}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-gray-700">{member.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Board of Directors Section */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Board of Directors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {boardMembers.map((member, index) => (
                <Card key={index} className="h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.image} alt={member.name} />
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{member.name}</CardTitle>
                      <CardDescription>{member.role}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-gray-700">{member.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}