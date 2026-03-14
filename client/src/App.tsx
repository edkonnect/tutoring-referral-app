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
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductPromotions from "./pages/admin/AdminProductPromotions";
import AdminPromoTemplates from "./pages/admin/AdminPromoTemplates";
import AdminSettings from "./pages/admin/AdminSettings";

// Promoter pages
import PromoterDashboard from "./pages/promoter/PromoterDashboard";
import PromoterParents from "./pages/promoter/PromoterParents";
import AddParent from "./pages/promoter/AddParent";
import EditParent from "./pages/promoter/EditParent";
import PromoterStudents from "./pages/promoter/PromoterStudents";
import PromoterEarnings from "./pages/promoter/PromoterEarnings";
import PromoterProducts from "./pages/promoter/PromoterProducts";
import PromoterMyPromotions from "./pages/promoter/PromoterMyPromotions";

// Public pages
import ReferralRegister from "./pages/ReferralRegister";
import AccountSetup from "./pages/AccountSetup";
import EnrollmentLanding from "./pages/EnrollmentLanding";

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
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/product-promotions" component={AdminProductPromotions} />
      <Route path="/admin/promo-templates" component={AdminPromoTemplates} />
      <Route path="/admin/settings" component={AdminSettings} />

      {/* Promoter routes */}
      <Route path="/promoter" component={PromoterDashboard} />
      <Route path="/promoter/parents/new" component={AddParent} />
      <Route path="/promoter/parents/:id/edit" component={EditParent} />
      <Route path="/promoter/parents" component={PromoterParents} />
      <Route path="/promoter/students" component={PromoterStudents} />
      <Route path="/promoter/earnings" component={PromoterEarnings} />
      <Route path="/promoter/products" component={PromoterProducts} />
      <Route path="/promoter/my-promotions" component={PromoterMyPromotions} />

      {/* Public referral registration - no auth required */}
      <Route path="/refer/:token" component={ReferralRegister} />

      {/* Public product enrollment via email link - no auth required */}
      <Route path="/enroll/:token" component={EnrollmentLanding} />

      {/* Account setup via invite link - no auth required */}
      <Route path="/setup/:token" component={AccountSetup} />

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
