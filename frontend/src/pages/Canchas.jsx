import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import api from "../lib/api";
import { Input } from "../components/ui/input";

export default function Canchas() {
  const [canchas, setCanchas] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/canchas").then(r => setCanchas(r.data)).catch(() => {}); }, []);

  const filtered = canchas.filter(c => {
    const s = (c.nombre + " " + (c.local?.nombre || "") + " " + (c.local?.direccion || "")).toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div data-testid="canchas-page" className="min-h-screen">
      {/* STATS BAND */}
      <section className="bg-[#D4E8C9] py-12 mb-2">
        <div className="max-w-6xl mx-auto px-4">
          <p className="font-hand text-2xl text-[#1F4D2A] text-center">Con</p>
          <h1 className="font-display text-4xl md:text-5xl font-black text-[#1F4D2A] text-center mb-8">Nosotros</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div><div className="font-display text-4xl font-black text-[#1F4D2A]">20+</div><div className="text-sm font-bold">Recintos Afiliados</div></div>
            <div><div className="font-display text-4xl font-black text-[#1F4D2A]">40+</div><div className="text-sm font-bold">Canchas Disponibles</div></div>
            <div><div className="font-display text-4xl font-black text-[#1F4D2A]">90+</div><div className="text-sm font-bold">Reservas Diarias</div></div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-10 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B5563]" />
            <Input
              data-testid="search-input"
              placeholder="Buscar cancha o ubicación..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-11 rounded-full border-[#D4E8C9] bg-white h-12"
            />
          </div>
        </div>

        <h2 className="font-display text-4xl md:text-5xl font-black text-[#1F4D2A] text-center mb-10">Canchas Disponibles</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((c) => (
            <Link to={`/canchas/${c.id}`} key={c.id} data-testid={`cancha-card-${c.id}`} className="bg-white rounded-3xl border border-[#E8F3E4] overflow-hidden card-lift block">
              <img src={c.imagenes?.[0] || c.local?.imagen || "https://images.unsplash.com/photo-1647118868186-70d38e10b0dc?w=800"} alt={c.nombre} className="w-full h-44 object-cover" />
              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-[#1F4D2A]">{c.nombre}</h3>
                <p className="text-xs text-[#4B5563] mt-1">{c.local?.nombre}</p>
                <p className="text-xs text-[#4B5563] mt-2 line-clamp-2">{c.local?.direccion}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-display font-bold text-[#1F4D2A]">${c.precio_base?.toFixed(2)}<span className="text-xs font-normal text-[#4B5563]">/hora base</span></span>
                  <span className="pill-btn text-xs"><ArrowUpRight size={14} /> Reservar</span>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-[#4B5563] py-10" data-testid="no-canchas">No se encontraron canchas.</div>
          )}
        </div>
      </div>
    </div>
  );
}
