import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, User, MapPin, Menu, X, LogOut, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/canchas", label: "Canchas" },
    { to: "/torneos", label: "Eventos" },
  ];
  if (user) links.splice(1, 0, { to: "/reservas", label: "Mis Reservas" });

  return (
    <header className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#E8F3E4]" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <div className="w-8 h-8 rounded-full bg-[#1F4D2A] flex items-center justify-center">
            <span className="font-display font-bold text-white text-sm">O</span>
          </div>
          <span className="font-display text-2xl font-bold text-[#1F4D2A]">OutSide</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) =>
                `font-body text-sm font-medium transition-colors ${isActive ? "text-[#1F4D2A]" : "text-[#4B5563] hover:text-[#1F4D2A]"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user?.role === "admin" && (
            <button
              data-testid="admin-panel-btn"
              onClick={() => navigate("/admin")}
              className="pill-btn-outline text-sm"
            >
              <Shield size={16} /> Panel Admin
            </button>
          )}
          <button data-testid="register-cancha-btn" className="pill-btn text-sm" onClick={() => navigate(user?.role === "admin" ? "/admin" : "/canchas")}>
            <MapPin size={16} /> Registra tu cancha
          </button>
          <div className="w-px h-6 bg-[#D1D5DB]" />
          <button className="p-2 rounded-full hover:bg-[#E8F3E4] transition" data-testid="search-btn">
            <Search size={18} className="text-[#1F4D2A]" />
          </button>
          {user ? (
            <div className="relative">
              <button
                data-testid="user-menu-btn"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-[#E8F3E4] transition"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#D4E8C9] flex items-center justify-center text-[#1F4D2A] font-semibold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-[#1F4D2A] max-w-[120px] truncate">{user.name || user.email}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8F3E4] shadow-lg py-2 overflow-hidden" data-testid="user-menu">
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-[#E8F3E4]">Mi cuenta</Link>
                  <Link to="/reservas" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-[#E8F3E4]">Mis Reservas</Link>
                  {user.role === "admin" && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-[#E8F3E4]">Panel Admin</Link>
                  )}
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-[#9B2226] hover:bg-[#FBEAEA] flex items-center gap-2" data-testid="logout-btn">
                    <LogOut size={14} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button data-testid="login-btn" onClick={handleLogin} className="p-2 rounded-full hover:bg-[#E8F3E4]">
              <User size={18} className="text-[#1F4D2A]" />
            </button>
          )}
        </div>

        <button className="md:hidden p-2" data-testid="mobile-menu-btn" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 border-t border-[#E8F3E4] bg-white" data-testid="mobile-menu">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-[#1F4D2A]">
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-3 text-sm font-medium">Mi cuenta</Link>
              {user.role === "admin" && (
                <Link to="/admin" onClick={() => setOpen(false)} className="block py-3 text-sm font-medium">Panel Admin</Link>
              )}
              <button onClick={logout} className="block py-3 text-sm font-medium text-[#9B2226]">Cerrar sesión</button>
            </>
          ) : (
            <button onClick={handleLogin} className="pill-btn w-full justify-center mt-2">Iniciar sesión</button>
          )}
        </div>
      )}
    </header>
  );
}
