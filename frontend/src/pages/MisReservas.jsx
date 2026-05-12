import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, CreditCard } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function MisReservas() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/reservas/me").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    try { await api.put(`/reservas/${id}/cancel`); toast.success("Reserva cancelada"); load(); }
    catch { toast.error("Error al cancelar"); }
  };
  const confirm = async (id) => {
    try { await api.put(`/reservas/${id}/confirm`); toast.success("Reserva confirmada"); load(); }
    catch { toast.error("Error al confirmar"); }
  };
  const pay = async (id) => {
    try {
      const r = await api.post("/payments/checkout", { reserva_id: id, origin_url: window.location.origin });
      window.location.href = r.data.url;
    } catch { toast.error("Error al iniciar pago"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" data-testid="mis-reservas-page">
      <h1 className="font-display text-4xl font-black text-[#1F4D2A] mb-8">Mis Reservas</h1>
      {items.length === 0 ? (
        <div className="bg-white border border-[#E8F3E4] rounded-3xl p-10 text-center">
          <p className="text-[#4B5563]">Aún no tienes reservas.</p>
          <Link to="/canchas" className="pill-btn mt-5 inline-flex" data-testid="ir-canchas">Reservar ahora</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="bg-white border border-[#E8F3E4] rounded-3xl p-5 flex flex-col md:flex-row md:items-center gap-4" data-testid={`reserva-${r.id}`}>
              <img src={r.cancha?.imagenes?.[0] || r.local?.imagen} alt="" className="w-full md:w-32 h-24 object-cover rounded-2xl" />
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-[#1F4D2A]">{r.cancha?.nombre || "Cancha"}</h3>
                <p className="text-sm text-[#4B5563]">{r.local?.nombre} · {r.local?.direccion}</p>
                <p className="text-sm mt-1"><strong>{r.fecha}</strong> a las <strong>{r.hora}</strong></p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {r.cancelada && <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">Cancelada</span>}
                  {!r.cancelada && r.confirmada && <span className="text-xs px-3 py-1 rounded-full bg-[#D4E8C9] text-[#1F4D2A] font-semibold">Confirmada</span>}
                  {!r.cancelada && !r.confirmada && <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Pendiente de pago</span>}
                  {r.payment_status === "paid" && <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Pagada</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-black text-[#1F4D2A]">${r.precio?.toFixed(2)}</div>
                <div className="flex gap-2 mt-3 justify-end flex-wrap">
                  {!r.cancelada && !r.confirmada && (
                    <button onClick={() => pay(r.id)} data-testid={`pay-${r.id}`} className="pill-btn-dark text-xs"><CreditCard size={14} /> Pagar</button>
                  )}
                  {!r.cancelada && (
                    <button onClick={() => confirm(r.id)} data-testid={`confirm-${r.id}`} className="pill-btn text-xs"><CheckCircle size={14} /> Confirmar</button>
                  )}
                  {!r.cancelada && (
                    <button onClick={() => cancel(r.id)} data-testid={`cancel-${r.id}`} className="pill-btn-outline text-xs"><XCircle size={14} /> Cancelar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
