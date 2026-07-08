import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Public client pages
import Welcome from '@/pages/Welcome';
import Onboarding from '@/pages/Onboarding';
import Discover from '@/pages/Discover';
import PropertyDetail from '@/pages/PropertyDetail';
import Favorites from '@/pages/Favorites';
import ClientProfile from '@/pages/ClientProfile';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Admin pages
import AdminLayout from '@/components/AdminLayout';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminClients from '@/pages/AdminClients';
import AdminClientDetail from '@/pages/AdminClientDetail';
import AdminProperties from '@/pages/AdminProperties';
import AdminVisits from '@/pages/AdminVisits';
import AdminTasks from '@/pages/AdminTasks';
import AdminIntelligence from '@/pages/AdminIntelligence';
import AdminDemoChecklist from '@/pages/AdminDemoChecklist';
import AdminWhiteLabel from '@/pages/AdminWhiteLabel';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Public client routes - no auth required */}
            <Route path="/" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/profile" element={<ClientProfile />} />

            {/* Auth pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin protected routes */}
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/clients" element={<AdminClients />} />
                <Route path="/admin/client/:id" element={<AdminClientDetail />} />
                <Route path="/admin/intelligence" element={<AdminIntelligence />} />
                <Route path="/admin/properties" element={<AdminProperties />} />
                <Route path="/admin/visits" element={<AdminVisits />} />
                <Route path="/admin/tasks" element={<AdminTasks />} />
                <Route path="/admin/demo-checklist" element={<AdminDemoChecklist />} />
                <Route path="/admin/white-label" element={<AdminWhiteLabel />} />
              </Route>
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App