import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Trophy, Users } from "lucide-react";
import api from "../lib/api";

export default function Torneos() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api
      .get("/torneos")
      .then((r) => setItems(r.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" data-testid="torneos-page">
      <section className="bg-[#D4E8C9] py-14">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="font-display text-2xl text-[#1F4D2A]">Vive la</p>
          <h1 className="font-display text-5xl md:text-6xl font-black text-[#1F4D2A]">
            Pasión del fútbol
          </h1>
          <p className="text-[#1F4D2A]/80 mt-4 max-w-2xl mx-auto">
            Postula tu equipo y compite en los torneos más emocionantes de
            Barranquilla.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="font-display text-3xl md:text-4xl font-black text-[#1F4D2A] mb-8">
          Torneos disponibles
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {items.map((t) => (
            <Link
              to={`/torneos/${t.id}`}
              key={t.id}
              data-testid={`torneo-${t.id}`}
              className="bg-white rounded-3xl border border-[#E8F3E4] overflow-hidden card-lift block"
            >
              <img
                src={t.imagen}
                alt={t.nombre}
                className="w-full h-44 object-cover"
              />
              <div className="p-5 bg-[#E8F3E4]">
                <h3 className="font-display text-lg font-bold text-[#1F4D2A]">
                  {t.nombre}
                </h3>
                <p className="text-xs text-[#1F4D2A]/80 mt-1 line-clamp-2">
                  {t.descripcion}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <Trophy size={14} /> {t.tipo}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#1F4D2A] text-white font-semibold">
                    {t.categoria || "Senior"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {t.equipos_count}/{t.cupo_maximo || "?"}
                  </span>
                </div>
                <div className="pill-btn-dark mt-4 inline-flex text-xs">
                  Ver más <ArrowUpRight size={14} />
                </div>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-10 text-[#4B5563]">
              Aún no hay torneos disponibles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
