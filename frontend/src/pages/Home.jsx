import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Users, MapPinned, Trophy } from "lucide-react";
import api from "../lib/api";

const HERO_IMG =
  "https://images.unsplash.com/photo-1776160043138-52e2cf9c6e4e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxuaWdodCUyMHNvY2NlciUyMGZpZWxkJTIwc3RhZGl1bXxlbnwwfHx8fDE3Nzg1OTQwNDZ8MA&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const [canchas, setCanchas] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [stats, setStats] = useState({
    recintos: 0,
    canchas: 0,
    reservas_hoy: 0,
  });

  useEffect(() => {
    api
      .get("/canchas")
      .then((r) => setCanchas(r.data.slice(0, 3)))
      .catch(() => {});
    api
      .get("/torneos")
      .then((r) => setTorneos(r.data.slice(0, 3)))
      .catch(() => {});
    api
      .get("/stats")
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section
        className="relative h-[88vh] min-h-[600px] w-full overflow-hidden"
        data-testid="hero-section"
      >
        <img
          src={HERO_IMG}
          alt="Cancha de fútbol nocturna"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <span className="font-display text-white/90 text-3xl md:text-4xl mb-2 fade-up">
            Con
          </span>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white fade-up-delay-1">
            OutSide
          </h1>
          <p className="font-display text-xl md:text-3xl lg:text-4xl font-bold text-white max-w-3xl mt-3 fade-up-delay-2">
            Reserva cualquier cancha de Barranquilla
            <br />
            desde una misma plataforma
          </p>
          <Link
            to="/canchas"
            className="mt-10 pill-btn text-base fade-up-delay-3"
            data-testid="hero-cta"
          >
            Reservar ahora <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="bg-[#D4E8C9] py-14" data-testid="stats-band">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-display text-2xl text-[#1F4D2A] text-center mb-1">
            Con
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-black text-[#1F4D2A] text-center mb-10">
            Nosotros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                Icon: Users,
                num: `${Math.max(stats.recintos, 5)}`,
                label: "Recintos Afiliados",
              },
              {
                Icon: MapPinned,
                num: `${Math.max(stats.canchas, 10)}`,
                label: "Canchas Disponibles",
              },
              {
                Icon: Trophy,
                num: `${Math.max(stats.reservas_hoy, 30)}+`,
                label: "Reservas Diarias",
              },
            ].map(({ Icon, num, label }, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-4"
                data-testid={`stat-${i}`}
              >
                <Icon size={56} strokeWidth={2.5} className="text-[#1F4D2A]" />
                <div>
                  <div className="font-display text-5xl font-black text-[#1F4D2A]">
                    {num}
                  </div>
                  <div className="font-display text-sm font-bold text-[#1F4D2A]">
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTRO + CTAs */}
      <section className="py-20 px-4" data-testid="intro-section">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#1F4D2A] mb-6">
            Las mejores canchas de la ciudad
            <span className="text-[#5BA86F]">|</span>
          </h2>
          <p className="font-body text-lg text-[#4B5563] max-w-3xl mx-auto leading-relaxed">
            Encuentra aquí las mejores canchas sintéticas de la ciudad de
            Barranquilla. Ven a pasar tiempo en familia o con amigos y disfruta
            en cualquiera de nuestras canchas disponibles especialmente para ti.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              to="/canchas"
              data-testid="consultar-canchas-btn"
              className="pill-btn"
            >
              Consultar canchas
            </Link>
            <Link
              to="/torneos"
              data-testid="consultar-eventos-btn"
              className="pill-btn"
            >
              Consultar eventos
            </Link>
          </div>
          <div className="mt-12 h-px bg-[#5BA86F]" />
        </div>
      </section>

      {/* CANCHAS DESTACADAS */}
      <section className="py-12 px-4" data-testid="canchas-destacadas">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-black text-[#1F4D2A] text-center mb-12">
            Canchas Destacadas
          </h2>
          <div className="space-y-12">
            {canchas.map((c, idx) => (
              <div
                key={c.id}
                className={`grid md:grid-cols-2 gap-8 items-center ${idx % 2 === 1 ? "md:[direction:rtl]" : ""}`}
                data-testid={`featured-cancha-${idx}`}
              >
                <img
                  src={c.imagenes?.[0] || c.local?.imagen}
                  alt={c.nombre}
                  className="w-full h-64 md:h-72 object-cover rounded-3xl shadow-md"
                />
                <div className="md:[direction:ltr]">
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-[#1F4D2A]">
                    {c.local?.nombre || c.nombre}
                  </h3>
                  <div className="mt-3">
                    <div className="font-display font-bold text-[#1F4D2A]">
                      Ubicación:
                    </div>
                    <p className="text-sm text-[#4B5563]">
                      {c.local?.direccion || "Barranquilla, Atlántico"}
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="font-display font-bold text-[#1F4D2A]">
                      Horarios:
                    </div>
                    <p className="text-sm text-[#4B5563]">
                      Lunes - Domingo, 9 am - 11 pm
                    </p>
                  </div>
                  <Link
                    to={`/canchas/${c.id}`}
                    className="pill-btn mt-5 inline-flex"
                    data-testid={`reservar-${c.id}`}
                  >
                    Reservar ahora <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/canchas"
              className="pill-btn-outline"
              data-testid="ver-todas-canchas"
            >
              <ArrowUpRight size={16} /> Ver Todos
            </Link>
          </div>
        </div>
      </section>

      {/* NOTICIAS Y EVENTOS */}
      <section className="py-20 px-4" data-testid="news-section">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-black text-[#1F4D2A] text-center mb-4">
            Noticias y Eventos
          </h2>
          <p className="text-center font-body text-[#4B5563] mb-10 max-w-3xl mx-auto">
            Entérate de todo lo que está pasando, mantente al tanto de los
            eventos recientes y futuros aquí.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {torneos.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-[#E8F3E4] overflow-hidden card-lift"
                data-testid={`torneo-card-${t.id}`}
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
                  <p className="text-sm text-[#1F4D2A]/80 mt-1 line-clamp-2">
                    {t.descripcion}
                  </p>
                  <Link
                    to={`/torneos/${t.id}`}
                    className="pill-btn-dark mt-3 text-xs inline-flex"
                  >
                    Ver más información <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/torneos"
              className="pill-btn-outline"
              data-testid="ver-todos-torneos"
            >
              <ArrowUpRight size={16} /> Ver Todos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
