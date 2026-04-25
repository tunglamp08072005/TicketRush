import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './features/events/pages/LandingPage';
import EventsPage from './features/events/pages/EventsPage';
import EventDetailPage from './features/events/pages/EventDetailPage';
import EventSeatBookingPage from './features/events/pages/EventSeatBookingPage';
import EventPaymentPage from './features/events/pages/EventPaymentPage';
import AdminPaymentsReviewPage from './features/order-payment/pages/AdminPaymentsReviewPage';
import AuthPage from './features/auth/pages/AuthPage';
import UserDashboard from './features/user/pages/UserDashboard';
import AdminEventDashboard from './features/admin-events/pages/AdminEventDashboard';
import AdminUsersOverviewPage from './features/user/pages/AdminUsersOverviewPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import { getAuthSession } from './features/auth/utils/authStorage';

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
      <Routes>
        <Route path="/" element={<HomeEntryRoute />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/events/:eventId/booking" element={<EventSeatBookingPage />} />
        <Route path="/events/:eventId/booking/payment" element={<EventPaymentPage />} />
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
          path="/user/events/:eventId"
          element={
            <ProtectedRoute requiredRole="USER">
              <EventDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/events/:eventId/booking"
          element={
            <ProtectedRoute requiredRole="USER">
              <EventSeatBookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/events/:eventId/booking/payment"
          element={
            <ProtectedRoute requiredRole="USER">
              <EventPaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="events" replace />} />
          <Route path="dashboard" element={<AdminEventDashboard />} />
          <Route path="events" element={<AdminEventDashboard />} />
          <Route path="payments" element={<AdminPaymentsReviewPage />} />
          <Route path="users" element={<AdminUsersOverviewPage />} />
          <Route path="settings" element={<AdminEventDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
