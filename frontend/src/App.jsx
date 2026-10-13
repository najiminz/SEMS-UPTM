import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Events from './pages/Events';
import CalendarPage from './pages/CalendarPage';
import Profile from './pages/Profile';
import ChangeEmail from './pages/ChangeEmail';

import ClubDashboard from './pages/club/Dashboard';
import MyProposals from './pages/club/MyProposals';
import ProposalForm from './pages/club/ProposalForm';
import PostEventReports from './pages/club/PostEventReports';
import ProposalDetail from './pages/club/ProposalDetail';

import HepaDashboard from './pages/hepa/Dashboard';
import ReviewProposal from './pages/hepa/ReviewProposal';
import ProposalPrintForm from './pages/hepa/ProposalPrintForm';
import ProposalReview from './pages/hepa/ProposalReview';
import ApprovedEvents from './pages/hepa/ApprovedEvents';
import HepaReports from './pages/hepa/Reports';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminClubs from './pages/admin/Clubs';
import AdminClubDetail from './pages/admin/ClubDetail';
import AdminProposals from './pages/admin/Proposals';
import AdminProposalDetail from './pages/admin/ProposalDetail';
import AdminEvents from './pages/admin/Events';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminSettings from './pages/admin/Settings';
import AdminReports from './pages/admin/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/events"
            element={
              <ProtectedRoute roles={['club_committee', 'hepa_officer', 'admin']}>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute roles={['club_committee', 'hepa_officer', 'admin']}>
                <CalendarPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={['club_committee', 'hepa_officer', 'admin']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-email"
            element={
              <ProtectedRoute roles={['club_committee', 'hepa_officer', 'admin']}>
                <ChangeEmail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/club"
            element={
              <ProtectedRoute roles={['club_committee']}>
                <ClubDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/proposals"
            element={
              <ProtectedRoute roles={['club_committee']}>
                <MyProposals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/new"
            element={
              <ProtectedRoute roles={['club_committee']}>
                <ProposalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/proposals/:id/edit"
            element={
              <ProtectedRoute roles={['club_committee']}>
                <ProposalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/reports"
            element={
              <ProtectedRoute roles={['club_committee']}>
                <PostEventReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/proposals/:id"
            element={
              <ProtectedRoute roles={['club_committee']}>
                <ProposalDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hepa"
            element={
              <ProtectedRoute roles={['hepa_officer']}>
                <HepaDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hepa/review"
            element={
              <ProtectedRoute roles={['hepa_officer']}>
                <ProposalReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hepa/events"
            element={
              <ProtectedRoute roles={['hepa_officer']}>
                <ApprovedEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hepa/reports"
            element={
              <ProtectedRoute roles={['hepa_officer']}>
                <HepaReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hepa/proposals/:id/form"
            element={
              <ProtectedRoute roles={['hepa_officer']}>
                <ProposalPrintForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hepa/proposals/:id"
            element={
              <ProtectedRoute roles={['hepa_officer']}>
                <ReviewProposal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clubs"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminClubs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clubs/:id"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminClubDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/proposals"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminProposals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/proposals/:id"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminProposalDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminAuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
