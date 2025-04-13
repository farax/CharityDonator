import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Payment from "@/pages/Payment";
import { DonationProvider } from "@/components/DonationContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/payment" component={Payment} />
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
