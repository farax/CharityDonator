import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AboutUs() {
  // Team members data
  const teamMembers = [
    {
      name: "Dr. Sarah Ahmed",
      role: "Founder & Medical Director",
      bio: "Dr. Ahmed has over 15 years of experience in humanitarian medicine and has led medical missions in over 20 countries. She founded Aafiyaa Charity Clinics to provide sustainable healthcare solutions to underserved communities.",
      image: "/images/team/sarah.jpg",
      initials: "SA"
    },
    {
      name: "Mohammed Qureshi",
      role: "Operations Director",
      bio: "With a background in logistics and international development, Mohammed ensures our clinics run efficiently and effectively even in challenging environments.",
      image: "/images/team/mohammed.jpg",
      initials: "MQ"
    },
    {
      name: "Dr. Abdullah Khan",
      role: "Medical Coordinator",
      bio: "Dr. Khan specializes in emergency medicine and coordinates our medical volunteers and training programs. He has extensive experience working in conflict zones.",
      image: "/images/team/abdullah.jpg",
      initials: "AK"
    },
    {
      name: "Dr. Fatima Ali",
      role: "Pediatrics Specialist",
      bio: "Specializing in pediatric care, Dr. Ali leads our children's health initiatives and has developed several sustainable healthcare programs for infants and young children.",
      image: "/images/team/fatima.jpg",
      initials: "FA"
    },
    {
      name: "Aisha Hassan",
      role: "Community Outreach Coordinator",
      bio: "Aisha works directly with communities to understand their healthcare needs and ensures our services are accessible to those who need them most.",
      image: "/images/team/aisha.jpg",
      initials: "AH"
    },
    {
      name: "Ibrahim Malik",
      role: "Financial Director",
      bio: "Ibrahim brings over a decade of experience in nonprofit financial management, ensuring that donations are used effectively and with full transparency.",
      image: "/images/team/ibrahim.jpg",
      initials: "IM"
    }
  ];

  // Board members data
  const boardMembers = [
    {
      name: "Dr. Hassan Rahman",
      role: "Board Chairperson",
      bio: "As Chair of the Board of Directors, Dr. Rahman brings decades of experience in international healthcare policy and governance.",
      image: "/images/board/hassan.jpg",
      initials: "HR"
    },
    {
      name: "Amina Patel",
      role: "Board Secretary",
      bio: "Amina is a respected humanitarian lawyer who has advised international NGOs on ethical operations and governance.",
      image: "/images/board/amina.jpg",
      initials: "AP"
    },
    {
      name: "Yusuf Mahmood",
      role: "Board Treasurer",
      bio: "With expertise in financial oversight and nonprofit accounting, Yusuf ensures our financial practices meet the highest standards.",
      image: "/images/board/yusuf.jpg",
      initials: "YM"
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
                  Founded in 2017, Aafiyaa Charity Clinics is dedicated to providing essential medical care to underserved and vulnerable communities around the world.
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

          {/* Our Team Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
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