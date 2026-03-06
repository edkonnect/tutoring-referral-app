import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPromoters from "./pages/admin/AdminPromoters";
import AdminParents from "./pages/admin/AdminParents";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import AdminPayouts from "./pages/admin/AdminPayouts";

// Promoter pages
import PromoterDashboard from "./pages/promoter/PromoterDashboard";
import PromoterParents from "./pages/promoter/PromoterParents";
import PromoterStudents from "./pages/promoter/PromoterStudents";
import PromoterEarnings from "./pages/promoter/PromoterEarnings";

// Public pages
import ReferralRegister from "./pages/ReferralRegister";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/promoters" component={AdminPromoters} />
      <Route path="/admin/parents" component={AdminParents} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/enrollments" component={AdminEnrollments} />
      <Route path="/admin/payouts" component={AdminPayouts} />

      {/* Promoter routes */}
      <Route path="/promoter" component={PromoterDashboard} />
      <Route path="/promoter/parents" component={PromoterParents} />
      <Route path="/promoter/students" component={PromoterStudents} />
      <Route path="/promoter/earnings" component={PromoterEarnings} />

      {/* Public referral registration - no auth required */}
      <Route path="/refer/:token" component={ReferralRegister} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
