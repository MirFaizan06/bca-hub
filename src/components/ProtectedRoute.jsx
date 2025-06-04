// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const stored = localStorage.getItem("user");
  if (!stored) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(stored);
  if (!user.isApproved) {
    // Registered but not yet approved
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.isAdmin) {
    // Logged in but not admin
    return <Navigate to="/dashboard" replace />;
  }

  // User is allowed
  return children;
}
