import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { getAuthSession } from './features/auth/utils/authStorage';

const LandingPage = lazy(() => import('./features/events/pages/LandingPage'));
const EventsPage = lazy(() => import('./features/events/pages/EventsPage'));
const EventDetailPage = lazy(() => import('./features/events/pages/EventDetailPage'));
const EventSeatBookingPage = lazy(() => import('./features/events/pages/EventSeatBookingPage'));
const EventPaymentPage = lazy(() => import('./features/events/pages/EventPaymentPage'));
const PaymentResultPage = lazy(() => import('./features/events/pages/PaymentResultPage'));
const EventWaitingRoomPage = lazy(() => import('./features/events/pages/EventWaitingRoomPage'));
const SupportPage = lazy(() => import('./features/support/pages/SupportPage'));
const AdminPaymentsReviewPage = lazy(() => import('./features/order-payment/pages/AdminPaymentsReviewPage'));
const AuthPage = lazy(() => import('./features/auth/pages/AuthPage'));
const UserDashboard = lazy(() => import('./features/user/pages/UserDashboard'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const UserEventLayout = lazy(() => import('./layouts/UserEventLayout'));
const AdminEventDashboard = lazy(() => import('./features/admin-events/pages/AdminEventDashboard'));
const AdminOverviewPage = lazy(() => import('./features/admin-events/pages/AdminOverviewPage'));
const AdminSettingsPage = lazy(() => import('./features/admin-events/pages/AdminSettingsPage'));
const AdminDemographicsPage = lazy(() => import('./features/admin-events/pages/AdminDemographicsPage'));
const AdminUsersOverviewPage = lazy(() => import('./features/user/pages/AdminUsersOverviewPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">
      Đang tải...
    </div>
  );
}

function HomeEntryRoute() {
  const { token, role } = getAuthSession();

  if (token && role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (token && role === 'USER') {
    return <Navigate to="/user" replace />;
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomeEntryRoute />} />
          <Route path="/events" element={<EventsPage />} />
          <Route
            path="/support"
            element={
              <ProtectedRoute requiredRole="USER">
                <SupportPage />
              </ProtectedRoute>
            }
          />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/:eventId/booking" element={<EventSeatBookingPage />} />
          <Route path="/events/:eventId/booking/payment" element={<EventPaymentPage />} />
          <Route path="/payment-result" element={<PaymentResultPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/user"
            element={
              <ProtectedRoute requiredRole="USER">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/events"
            element={
              <ProtectedRoute requiredRole="USER">
                <UserEventLayout />
              </ProtectedRoute>
            }
          >
            <Route path=":eventId" element={<EventDetailPage />} />
            <Route path=":eventId/waiting-room" element={<EventWaitingRoomPage />} />
            <Route path=":eventId/booking" element={<EventSeatBookingPage />} />
            <Route path=":eventId/booking/payment" element={<EventPaymentPage />} />
            <Route path=":eventId/payment/:orderId" element={<EventPaymentPage />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminOverviewPage />} />
            <Route path="events" element={<AdminEventDashboard />} />
            <Route path="demographics" element={<AdminDemographicsPage />} />
            <Route path="payments" element={<AdminPaymentsReviewPage />} />
            <Route path="users" element={<AdminUsersOverviewPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
