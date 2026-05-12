import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Trophy, Users, CalendarDays, ArrowUpRight } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export default function TorneoDetail() {
  const { id } = useParams();
  const [torneo, setTorneo] = useState(null);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const load = () => api.get(`/torneos/${id}`).then(r => setTorneo(r.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const postular = async () => {
    if (!user) {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin + "/dashboard";
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }
    if (!nombre.trim()) { toast.error("Ingresa el nombre del equipo"); return; }
    setLoading(true);
    try {
      await api.post(`/torneos/${id}/postular`, { nombre });
      toast.success("Equipo postulado!");
      setNombre("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error al postular");
    } finally { setLoading(false); }
  };

  if (!torneo) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" data-testid="torneo-detail">
      <img src={torneo.imagen} alt={torneo.nombre} className="w-full h-72 object-cover rounded-3xl" />
      <h1 className="font-display text-4xl md:text-5xl font-black text-[#1F4D2A] mt-6">{torneo.nombre}</h1>
      <div className="flex flex-wrap gap-3 mt-3 text-sm text-[#4B5563]">
        <span className="flex items-center gap-1"><Trophy size={16} /> {torneo.tipo}</span>
        <span className="px-3 py-1 rounded-full bg-[#1F4D2A] text-white font-semibold text-xs">{torneo.categoria || "Senior"}</span>
        <span className="flex items-center gap-1"><Users size={16} /> {torneo.equipos?.length || 0}/{torneo.cupo_maximo || "?"} equipos</span>
        {torneo.fecha_inicio && <span className="flex items-center gap-1"><CalendarDays size={16} /> Inicio: {torneo.fecha_inicio}</span>}
        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${torneo.abierto ? "bg-[#D4E8C9] text-[#1F4D2A]" : "bg-red-100 text-red-700"}`}>
          {torneo.abierto ? "Abierto" : "Cerrado"}
        </span>
      </div>
      <p className="mt-5 text-[#4B5563] leading-relaxed">{torneo.descripcion}</p>

      {torneo.abierto && (
        <div className="mt-8 bg-white border border-[#E8F3E4] rounded-3xl p-6" data-testid="postular-form">
          <h3 className="font-display text-xl font-bold text-[#1F4D2A] mb-3">Postula tu equipo</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del equipo" className="rounded-full h-11" data-testid="equipo-input" />
            <button onClick={postular} disabled={loading} className="pill-btn disabled:opacity-50" data-testid="postular-btn">
              {loading ? "Postulando..." : "Postularme"} <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-display text-xl font-bold text-[#1F4D2A] mb-3">Equipos inscritos</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(torneo.equipos || []).map(e => (
            <div key={e.id} className="bg-[#E8F3E4] rounded-2xl p-4">
              <div className="font-display font-bold text-[#1F4D2A]">{e.nombre}</div>
            </div>
          ))}
          {(!torneo.equipos || torneo.equipos.length === 0) && <p className="text-sm text-[#4B5563]">Aún no hay equipos inscritos. ¡Sé el primero!</p>}
        </div>
      </div>
    </div>
  );
}
