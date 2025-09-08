import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Payment from "@/pages/Payment";
import DonationSuccess from "@/pages/DonationSuccess";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import GetInvolved from "@/pages/GetInvolved";
import ActiveCases from "@/pages/ActiveCases";
import AboutUs from "@/pages/AboutUs";
import ContactUs from "@/pages/ContactUs";
import { DonationProvider } from "@/components/DonationContext";
import TawkToChat from "@/components/TawkToChat";

import { Toaster } from "@/components/ui/toaster";
import { 
  initAnalytics, 
  trackPageView, 
  trackTimeOnPage, 
  initNewRelicBrowserAgent 
} from "@/lib/analytics";


// Analytics-aware router that tracks page views
function Router() {
  const [location] = useLocation();

  // Track page views and time on page
  useEffect(() => {
    // Track page view when location changes
    trackPageView(location);

    // Track time spent on page when user navigates away
    const cleanup = trackTimeOnPage();

    // Scroll to top when location changes
    window.scrollTo(0, 0);

    return cleanup;
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/payment" component={Payment} />
      <Route path="/donation-success" component={DonationSuccess} />
      <Route path="/active-cases" component={ActiveCases} />
      <Route path="/get-involved" component={GetInvolved} />
      <Route path="/about" component={AboutUs} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/admin/login" component={AdminLogin} />
      {/* Make /admin come after /admin/login to ensure the right route is matched */}
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize analytics on first render
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <DonationProvider>
      <Router />
      <Toaster />
      <TawkToChat />
    </DonationProvider>
  );
}

export default App;
