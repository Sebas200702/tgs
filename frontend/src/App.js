import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Canchas from "./pages/Canchas";
import CanchaDetail from "./pages/CanchaDetail";
import MisReservas from "./pages/MisReservas";
import Torneos from "./pages/Torneos";
import TorneoDetail from "./pages/TorneoDetail";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import PaymentSuccess from "./pages/PaymentSuccess";

function AppRouter() {
  const location = useLocation();
  // Check URL fragment (not query params) for session_id
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <Navbar />
      <main className="min-h-[60vh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/canchas" element={<Canchas />} />
          <Route path="/canchas/:id" element={<CanchaDetail />} />
          <Route path="/reservas" element={<MisReservas />} />
          <Route path="/torneos" element={<Torneos />} />
          <Route path="/torneos/:id" element={<TorneoDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
