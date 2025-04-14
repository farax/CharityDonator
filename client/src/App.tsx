import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Payment from "@/pages/Payment";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import { DonationProvider } from "@/components/DonationContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/payment" component={Payment} />
      <Route path="/admin/login" component={AdminLogin} />
      {/* Make /admin come after /admin/login to ensure the right route is matched */}
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <DonationProvider>
      <Router />
    </DonationProvider>
  );
}

export default App;
