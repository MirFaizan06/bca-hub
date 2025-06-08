// src/App.jsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import MockTests from "./pages/MockTests";
import Contact from "./pages/Contact";
import Survey from "./pages/Survey";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Chats from "./pages/Chats";
import Register from "./pages/Register";
import Community from "./pages/Community";
import Announcements from "./pages/Announcements";
import Attendance from "./pages/Attendance";
import AttendanceAdmin from "./pages/AttendanceAdmin";
import AttendanceMarkPage from "./pages/AttendanceMarkPage";
import Schedule from "./pages/Schedule";
import Progress from "./pages/Progress";
import Achievements from "./pages/Achievements";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <>
      {/* Sonner toaster for toast notifications */}
      <Toaster position="top-right" richColors />

      <Router>
        <Header />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/survey" element={<Survey />} />
          <Route path="/attendance/mark" element={<AttendanceMarkPage />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/achievements" element={<Achievements />} />


          {/* Protected Routes (any approved user) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <Resources />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-tests"
            element={
              <ProtectedRoute>
                <MockTests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />

          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance-admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AttendanceAdmin />
              </ProtectedRoute>
            }
          />

          {/* Admin-only Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Fallback to Home if no match */}
          <Route path="*" element={<Home />} />
        </Routes>

        <Footer />
      </Router>
    </>
  );
}

export default App;
