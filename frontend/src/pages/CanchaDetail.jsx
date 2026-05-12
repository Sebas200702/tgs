import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Star, Ruler, ArrowUpRight, CalendarDays } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Calendar } from "../components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const HOURS = Array.from({ length: 14 }).map((_, i) => `${(9 + i).toString().padStart(2, "0")}:00`);

export default function CanchaDetail() {
  const { id } = useParams();
  const [cancha, setCancha] = useState(null);
  const [date, setDate] = useState(new Date());
  const [hora, setHora] = useState("18:00");
  const [precio, setPrecio] = useState(null);
  const [descuento, setDescuento] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api.get(`/canchas/${id}`).then(r => setCancha(r.data)).catch(() => {}); }, [id]);

  useEffect(() => {
    if (!cancha) return;
    const fecha = date.toISOString().slice(0, 10);
    api.post("/reservas/calcular-precio", { cancha_id: id, fecha, hora })
      .then(r => { setPrecio(r.data.precio); setDescuento(r.data.descuento); })
      .catch(() => {});
  }, [cancha, date, hora, id]);

  const handleReserve = async () => {
    if (!user) {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin + "/dashboard";
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }
    setLoading(true);
    try {
      const fecha = date.toISOString().slice(0, 10);
      const r = await api.post("/reservas", { local_id: cancha.local_id, cancha_id: id, fecha, hora });
      // Initiate payment
      const cr = await api.post("/payments/checkout", { reserva_id: r.data.id, origin_url: window.location.origin });
      window.location.href = cr.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error al reservar");
    } finally {
      setLoading(false);
    }
  };

  if (!cancha) return <div className="p-10 text-center" data-testid="loading">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10" data-testid="cancha-detail-page">
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <img src={cancha.imagenes?.[0] || cancha.local?.imagen} alt={cancha.nombre} className="w-full h-80 object-cover rounded-3xl" />
          <div className="grid grid-cols-3 gap-3 mt-3">
            {(cancha.imagenes || []).slice(1, 4).map((img, i) => (
              <img key={i} src={img} alt="" className="w-full h-24 object-cover rounded-2xl" />
            ))}
          </div>
        </div>
        <div>
          <h1 className="font-display text-4xl font-black text-[#1F4D2A]">{cancha.nombre}</h1>
          <p className="text-[#4B5563] mt-2">{cancha.local?.nombre}</p>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <Star size={16} className="text-[#F2B705] fill-[#F2B705]" />
            <span className="font-semibold">{cancha.local?.puntuacion?.toFixed(1) || "4.5"}</span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm text-[#4B5563]">
            <MapPin size={16} /> {cancha.local?.direccion}
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-[#4B5563]">
            <Ruler size={16} /> {cancha.dimensiones?.largo} × {cancha.dimensiones?.ancho} m
          </div>

          <p className="mt-5 text-[#4B5563] leading-relaxed">{cancha.descripcion}</p>

          {cancha.local?.reglamento?.length > 0 && (
            <div className="mt-5 bg-[#E8F3E4] rounded-2xl p-5">
              <h4 className="font-display font-bold text-[#1F4D2A] mb-2">Reglamento del local</h4>
              <ul className="text-sm text-[#1F4D2A] space-y-1 list-disc list-inside">
                {cancha.local.reglamento.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Reservation widget */}
      <div className="mt-12 bg-white border border-[#E8F3E4] rounded-3xl p-6 md:p-8 grid md:grid-cols-3 gap-6" data-testid="reservation-widget">
        <div>
          <h3 className="font-display text-xl font-bold text-[#1F4D2A] mb-3 flex items-center gap-2"><CalendarDays size={20} /> Selecciona fecha</h3>
          <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="rounded-2xl border border-[#E8F3E4]" disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-[#1F4D2A] mb-3">Hora</h3>
          <Select value={hora} onValueChange={setHora}>
            <SelectTrigger className="w-full h-11 rounded-full" data-testid="hour-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          {descuento && (
            <div className="mt-4 bg-[#E8F3E4] rounded-2xl p-4">
              <div className="text-xs font-bold text-[#1F4D2A]">Descuento aplicado</div>
              <div className="font-display text-lg font-bold">{descuento.nombre}</div>
              <div className="text-sm">-{descuento.porcentaje}%</div>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-[#1F4D2A] mb-3">Resumen</h3>
            <div className="text-sm text-[#4B5563] space-y-1">
              <div>Fecha: <strong>{date.toLocaleDateString("es-CO")}</strong></div>
              <div>Hora: <strong>{hora}</strong></div>
              <div>Precio base: <strong>${cancha.precio_base?.toFixed(2)}</strong></div>
              <div className="mt-2 text-2xl font-display font-black text-[#1F4D2A]" data-testid="total-price">Total: ${precio?.toFixed(2) || "..."}</div>
            </div>
          </div>
          <button onClick={handleReserve} disabled={loading} data-testid="reserve-button" className="pill-btn mt-5 w-full justify-center text-base disabled:opacity-50">
            {loading ? "Procesando..." : "Reservar y pagar"} <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
