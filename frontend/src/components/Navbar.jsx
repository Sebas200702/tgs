import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, User, MapPin, Menu, X, LogOut, Shield, ArrowRight, Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const routeIndex = [
  { path: "/", label: "Inicio", keywords: "home inicio principal" },
  { path: "/canchas", label: "Canchas", keywords: "canchas cancha futbol tenis padel" },
  { path: "/reservas", label: "Mis Reservas", keywords: "reservas reserva mis reservacion" },
  { path: "/torneos", label: "Eventos", keywords: "torneos torneo eventos competencia" },
  { path: "/admin", label: "Panel Admin", keywords: "admin administrador panel" },
  { path: "/dashboard", label: "Mi Cuenta", keywords: "dashboard cuenta perfil" },
  { path: "/registra-tu-cancha", label: "Registra tu cancha", keywords: "registrar cancha registro" },
  { path: "/quienes-somos", label: "Quiénes Somos", keywords: "quienes somos nosotros" },
  { path: "/faq", label: "Preguntas Frecuentes", keywords: "faq preguntas frecuentes ayuda" },
  { path: "/terminos", label: "Términos y Condiciones", keywords: "terminos condiciones legal" },
  { path: "/privacidad", label: "Privacidad", keywords: "privacidad datos politica" },
  { path: "/contacto", label: "Contacto", keywords: "contacto contacto" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [apiResults, setApiResults] = useState({ canchas: [], torneos: [], locales: [] });
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setApiResults({ canchas: [], torneos: [], locales: [] });
    }
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setQ("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQ("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setApiResults({ canchas: [], torneos: [], locales: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/search", { params: { q: q.trim() } });
        setApiResults(data);
      } catch {
        // ignore search errors
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const matchedRoutes = q.trim()
    ? routeIndex.filter((r) => {
        const s = (r.label + " " + r.keywords).toLowerCase();
        return s.includes(q.toLowerCase());
      })
    : [];

  const hasResults = matchedRoutes.length > 0 ||
    apiResults.canchas.length > 0 ||
    apiResults.torneos.length > 0 ||
    apiResults.locales.length > 0;

  const handleSelect = (path) => {
    navigate(path);
    setSearchOpen(false);
    setQ("");
  };

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const goRegistraTuCancha = () => navigate("/registra-tu-cancha");

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/canchas", label: "Canchas" },
    { to: "/torneos", label: "Eventos" },
  ];
  if (user) links.splice(1, 0, { to: "/reservas", label: "Mis Reservas" });

  return (
    <header
      className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#E8F3E4]"
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2"
          data-testid="logo-link"
        >
          <span className="font-display text-2xl font-bold text-[#1F4D2A]">
            OutSide
          </span>
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
          <button
            data-testid="register-cancha-btn"
            className="pill-btn text-sm"
            onClick={() =>
              navigate(
                user?.role === "admin" ? "/admin" : "/registra-tu-cancha",
              )
            }
          >
            <MapPin size={16} /> Registra tu cancha
          </button>
          <div className="w-px h-6 bg-[#D1D5DB]" />
          <div ref={searchRef} className="relative">
            <button
              className="p-2 rounded-full hover:bg-[#E8F3E4] transition"
              data-testid="search-btn"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search size={18} className="text-[#1F4D2A]" />
            </button>
            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-[#E8F3E4] shadow-lg overflow-hidden z-50">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8F3E4]">
                  <Search size={16} className="text-[#4B5563] shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar página..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="flex-1 text-sm outline-none bg-transparent text-[#1F4D2A] placeholder:text-[#9CA3AF]"
                  />
                  {q && (
                    <button onClick={() => setQ("")} className="text-[#9CA3AF] hover:text-[#4B5563]">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {!hasResults ? (
                    <p className="px-4 py-6 text-sm text-[#9CA3AF] text-center">
                      {q.trim() ? (
                        <>Sin resultados para <span className="font-medium">"{q}"</span></>
                      ) : (
                        "Escribe para buscar..."
                      )}
                    </p>
                  ) : (
                    <>
                      {matchedRoutes.length > 0 && (
                        <div>
                          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Páginas</p>
                          {matchedRoutes.map((r) => (
                            <button
                              key={r.path}
                              onClick={() => handleSelect(r.path)}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-[#E8F3E4] transition text-left"
                            >
                              <span className="text-[#1F4D2A] font-medium">{r.label}</span>
                              <ArrowRight size={14} className="text-[#9CA3AF]" />
                            </button>
                          ))}
                        </div>
                      )}
                      {apiResults.canchas.length > 0 && (
                        <div>
                          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider border-t border-[#E8F3E4]">Canchas</p>
                          {apiResults.canchas.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleSelect(`/canchas/${c.id}`)}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#E8F3E4] transition text-left"
                            >
                              <MapPin size={14} className="text-[#4B5563] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[#1F4D2A] font-medium truncate">{c.nombre}</p>
                                {c.local && (
                                  <p className="text-[#9CA3AF] text-xs truncate">{c.local.nombre}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {apiResults.torneos.length > 0 && (
                        <div>
                          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider border-t border-[#E8F3E4]">Eventos</p>
                          {apiResults.torneos.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleSelect(`/torneos/${t.id}`)}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#E8F3E4] transition text-left"
                            >
                              <Trophy size={14} className="text-[#4B5563] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[#1F4D2A] font-medium truncate">{t.nombre}</p>
                                <p className="text-[#9CA3AF] text-xs truncate">{t.categoria} · {t.equipos_count ?? 0} equipos</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {apiResults.locales.length > 0 && (
                        <div>
                          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider border-t border-[#E8F3E4]">Recintos</p>
                          {apiResults.locales.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => handleSelect(`/canchas?local=${l.id}`)}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#E8F3E4] transition text-left"
                            >
                              <MapPin size={14} className="text-[#4B5563] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[#1F4D2A] font-medium truncate">{l.nombre}</p>
                                <p className="text-[#9CA3AF] text-xs truncate">{l.direccion}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {user ? (
            <div className="relative">
              <button
                data-testid="user-menu-btn"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-[#E8F3E4] transition"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#D4E8C9] flex items-center justify-center text-[#1F4D2A] font-semibold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-[#1F4D2A] max-w-[120px] truncate">
                  {user.name || user.email}
                </span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8F3E4] shadow-lg py-2 overflow-hidden"
                  data-testid="user-menu"
                >
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-[#E8F3E4]"
                  >
                    Mi cuenta
                  </Link>
                  <Link
                    to="/reservas"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-[#E8F3E4]"
                  >
                    Mis Reservas
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-[#E8F3E4]"
                    >
                      Panel Admin
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-[#9B2226] hover:bg-[#FBEAEA] flex items-center gap-2"
                    data-testid="logout-btn"
                  >
                    <LogOut size={14} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              data-testid="login-btn"
              onClick={handleLogin}
              className="p-2 rounded-full hover:bg-[#E8F3E4]"
            >
              <User size={18} className="text-[#1F4D2A]" />
            </button>
          )}
        </div>

        <button
          className="md:hidden p-2"
          data-testid="mobile-menu-btn"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden px-4 pb-4 border-t border-[#E8F3E4] bg-white"
          data-testid="mobile-menu"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-[#1F4D2A]"
            >
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="block py-3 text-sm font-medium"
              >
                Mi cuenta
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm font-medium"
                >
                  Panel Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="block py-3 text-sm font-medium text-[#9B2226]"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="pill-btn w-full justify-center mt-2"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      )}
    </header>
  );
}
