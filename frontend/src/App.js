import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import { BotProvider } from "./context/BotContext";
import { I18nProvider } from "./i18n/I18nContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLock from "./pages/AppLock";
import Dashboard from "./pages/Dashboard";
import Trading from "./pages/Trading";
import Strategies from "./pages/Strategies";
import Risk from "./pages/Risk";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Market from "./pages/Market";
import BotControl from "./pages/BotControl";
import Subscription from "./pages/Subscription";
import Settings from "./pages/Settings";
import PaymentSuccess from "./pages/PaymentSuccess";

function App() {
  return (
    <div className="App">
      <I18nProvider>
        <AuthProvider>
          <BotProvider>
          <Toaster theme="dark" position="top-right" richColors closeButton />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/app-lock" element={<AppLock />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
              <Route path="/strategies" element={<ProtectedRoute><Strategies /></ProtectedRoute>} />
              <Route path="/risk" element={<ProtectedRoute><Risk /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
              <Route path="/bot-control" element={<ProtectedRoute><BotControl /></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </BotProvider>
      </AuthProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
