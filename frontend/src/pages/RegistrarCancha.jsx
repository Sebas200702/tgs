import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import api from "../lib/api";

export default function RegistrarCancha() {
  const [form, setForm] = useState({
    nombre_local: "", direccion: "", telefono: "", email: "",
    nombre_contacto: "", num_canchas: 1, mensaje: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre_local || !form.direccion || !form.email || !form.nombre_contacto) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setLoading(true);
    try {
      await api.post("/registros-cancha", { ...form, num_canchas: Number(form.num_canchas) });
      setDone(true);
      toast.success("¡Solicitud enviada! Te contactaremos pronto.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error al enviar la solicitud");
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center" data-testid="registro-success">
        <CheckCircle2 size={72} className="mx-auto text-[#1F4D2A]" />
        <h1 className="font-display text-4xl font-black text-[#1F4D2A] mt-6">¡Solicitud enviada!</h1>
        <p className="text-[#4B5563] mt-3 max-w-xl mx-auto">
          Recibimos tu solicitud para afiliar <strong>{form.nombre_local}</strong> a OutSide.
          Nuestro equipo te contactará en las próximas 24-48 horas al correo <strong>{form.email}</strong>.
        </p>
        <button onClick={() => navigate("/")} className="pill-btn mt-8" data-testid="back-home-btn">Volver al inicio</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="registrar-cancha-page">
      {/* Hero */}
      <section className="bg-[#D4E8C9] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="font-hand text-2xl text-[#1F4D2A]">Únete a nuestra red</p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-[#1F4D2A] mt-1">Registra tu cancha</h1>
          <p className="text-[#1F4D2A]/80 mt-4 max-w-2xl mx-auto">
            ¿Tienes un local con canchas sintéticas en Barranquilla? Afíliate a OutSide y empieza a recibir reservas hoy mismo.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
            <div className="font-display text-3xl font-black text-[#1F4D2A]">+90</div>
            <div className="text-sm text-[#4B5563]">Reservas diarias garantizadas</div>
          </div>
          <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
            <div className="font-display text-3xl font-black text-[#1F4D2A]">0%</div>
            <div className="text-sm text-[#4B5563]">Comisión durante el primer mes</div>
          </div>
          <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
            <div className="font-display text-3xl font-black text-[#1F4D2A]">24h</div>
            <div className="text-sm text-[#4B5563]">Tiempo promedio de aprobación</div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white border border-[#E8F3E4] rounded-3xl p-6 md:p-8 space-y-4" data-testid="registro-form">
          <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Datos del local</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre del local *</Label>
              <Input value={form.nombre_local} onChange={e => setForm({...form, nombre_local: e.target.value})} required data-testid="input-nombre-local" />
            </div>
            <div>
              <Label>Nombre del contacto *</Label>
              <Input value={form.nombre_contacto} onChange={e => setForm({...form, nombre_contacto: e.target.value})} required data-testid="input-nombre-contacto" />
            </div>
          </div>

          <div>
            <Label>Dirección del local *</Label>
            <Input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Ej: Cra. 53 #76-30, Riomar, Barranquilla" required data-testid="input-direccion" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required data-testid="input-email" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="+57 300 000 0000" data-testid="input-telefono" />
            </div>
            <div>
              <Label>N° de canchas</Label>
              <Input type="number" min="1" max="20" value={form.num_canchas} onChange={e => setForm({...form, num_canchas: e.target.value})} data-testid="input-num-canchas" />
            </div>
          </div>

          <div>
            <Label>Cuéntanos más (opcional)</Label>
            <Textarea rows={4} value={form.mensaje} onChange={e => setForm({...form, mensaje: e.target.value})} placeholder="Tipos de cancha (F5, F7, F8, F11), servicios adicionales, horarios..." data-testid="input-mensaje" />
          </div>

          <button type="submit" disabled={loading} className="pill-btn-dark w-full justify-center text-base disabled:opacity-50" data-testid="submit-registro">
            {loading ? "Enviando..." : "Enviar solicitud"} <ArrowUpRight size={18} />
          </button>
          <p className="text-xs text-[#4B5563] text-center">Al enviar este formulario aceptas nuestros Términos y Condiciones de afiliación.</p>
        </form>
      </div>
    </div>
  );
}
