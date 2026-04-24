import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white/60">
        <div className="font-mono text-sm">loading session…</div>
      </div>
    );
  }
  if (user === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
