import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './features/events/pages/LandingPage';
import EventsPage from './features/events/pages/EventsPage';
import EventDetailPage from './features/events/pages/EventDetailPage';
import EventSeatBookingPage from './features/events/pages/EventSeatBookingPage';
import EventPaymentPage from './features/events/pages/EventPaymentPage';
import AuthPage from './features/auth/pages/AuthPage';
import UserDashboard from './features/user/pages/UserDashboard';
import AdminEventDashboard from './features/admin-events/pages/AdminEventDashboard';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
          <Route path="users" element={<AdminEventDashboard />} />
          <Route path="settings" element={<AdminEventDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
