import React from "react";
import { Link } from "react-router-dom";
import { Shield, ClipboardList, MapPin, Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return <div className="p-10 text-center" data-testid="dashboard-loading">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" data-testid="dashboard-page">
      <div className="bg-[#D4E8C9] rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-4 border-white" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white text-[#1F4D2A] flex items-center justify-center text-3xl font-black font-display">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-hand text-2xl text-[#1F4D2A]">¡Bienvenido!</p>
          <h1 className="font-display text-3xl md:text-4xl font-black text-[#1F4D2A]">{user.name || user.email}</h1>
          <p className="text-sm text-[#1F4D2A]/70">{user.email} · {user.role === "admin" ? "Administrador" : "Usuario"}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        <Link to="/reservas" className="bg-white border border-[#E8F3E4] rounded-3xl p-6 card-lift block" data-testid="dash-reservas">
          <ClipboardList className="text-[#1F4D2A]" size={28} />
          <h3 className="font-display text-xl font-bold mt-3">Mis Reservas</h3>
          <p className="text-sm text-[#4B5563] mt-1">Consulta y administra tus reservas activas.</p>
        </Link>
        <Link to="/canchas" className="bg-white border border-[#E8F3E4] rounded-3xl p-6 card-lift block" data-testid="dash-canchas">
          <MapPin className="text-[#1F4D2A]" size={28} />
          <h3 className="font-display text-xl font-bold mt-3">Reservar Cancha</h3>
          <p className="text-sm text-[#4B5563] mt-1">Explora canchas disponibles y agenda tu próximo partido.</p>
        </Link>
        <Link to="/torneos" className="bg-white border border-[#E8F3E4] rounded-3xl p-6 card-lift block" data-testid="dash-torneos">
          <Trophy className="text-[#1F4D2A]" size={28} />
          <h3 className="font-display text-xl font-bold mt-3">Torneos</h3>
          <p className="text-sm text-[#4B5563] mt-1">Postula tu equipo a torneos abiertos.</p>
        </Link>
        {user.role === "admin" && (
          <Link to="/admin" className="bg-[#1F4D2A] text-white rounded-3xl p-6 card-lift block md:col-span-3" data-testid="dash-admin">
            <Shield size={28} />
            <h3 className="font-display text-xl font-bold mt-3">Panel de Administración</h3>
            <p className="text-sm text-white/80 mt-1">Gestiona canchas, locales, reservas, torneos y descuentos.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
