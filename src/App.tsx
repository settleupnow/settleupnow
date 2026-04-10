import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import AddInvoice from "./pages/AddInvoice";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetail from "./pages/InvoiceDetail";
import SettingsPage from "./pages/SettingsPage";
import BusinessProfileSettings from "./pages/settings/BusinessProfile";
import ReminderMessageSettings from "./pages/settings/ReminderMessage";
import TaxComplianceSettings from "./pages/settings/TaxCompliance";
import NotificationPreferences from "./pages/settings/NotificationPreferences";
import AdminDashboard from "./pages/AdminDashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import CheckEmail from "./pages/CheckEmail";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loading3Line } from "@mingcute/react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/blog" element={<BlogList />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/sign-in" element={user ? <Navigate to="/app" replace /> : <SignIn />} />
      <Route path="/sign-up" element={user ? <Navigate to="/app" replace /> : <SignUp />} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/app/login" element={<Navigate to="/sign-in" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/misson-control-15998" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/add" element={<AddInvoice />} />
                <Route path="/invoice/:id" element={<InvoiceDetail />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/profile" element={<BusinessProfileSettings />} />
                <Route path="/settings/reminder" element={<ReminderMessageSettings />} />
                <Route path="/settings/tax" element={<TaxComplianceSettings />} />
                <Route path="/settings/notifications" element={<NotificationPreferences />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
