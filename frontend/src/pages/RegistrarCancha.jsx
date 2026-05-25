import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Search,
  Clock,
  Check,
  X,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { toast } from "sonner";
import api from "../lib/api";

export default function RegistrarCancha() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" data-testid="registrar-cancha-page">
      <section className="bg-[#D4E8C9] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="font-display text-2xl text-[#1F4D2A]">
            Únete a nuestra red
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-[#1F4D2A] mt-1">
            Registra tu cancha
          </h1>
          <p className="text-[#1F4D2A]/80 mt-4 max-w-2xl mx-auto">
            ¿Tienes un local con canchas sintéticas en Barranquilla? Afíliate a
            OutSide y empieza a recibir reservas hoy mismo.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
            <div className="font-display text-3xl font-black text-[#1F4D2A]">
              +30
            </div>
            <div className="text-sm text-[#4B5563]">
              Reservas diarias garantizadas
            </div>
          </div>
          <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
            <div className="font-display text-3xl font-black text-[#1F4D2A]">
              0%
            </div>
            <div className="text-sm text-[#4B5563]">
              Comisión durante el primer mes
            </div>
          </div>
          <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
            <div className="font-display text-3xl font-black text-[#1F4D2A]">
              24h
            </div>
            <div className="text-sm text-[#4B5563]">
              Tiempo promedio de aprobación
            </div>
          </div>
        </div>

        <Tabs defaultValue="registrar">
          <TabsList className="bg-[#E8F3E4] mb-4">
            <TabsTrigger value="registrar" data-testid="tab-registrar">
              Nueva solicitud
            </TabsTrigger>
            <TabsTrigger value="consultar" data-testid="tab-consultar">
              Consultar mi solicitud
            </TabsTrigger>
          </TabsList>
          <TabsContent value="registrar">
            <FormRegistro navigate={navigate} />
          </TabsContent>
          <TabsContent value="consultar">
            <ConsultaRegistro />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FormRegistro({ navigate }) {
  const [form, setForm] = useState({
    nombre_local: "",
    direccion: "",
    telefono: "",
    email: "",
    nombre_contacto: "",
    num_canchas: 1,
    mensaje: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (
      !form.nombre_local ||
      !form.direccion ||
      !form.email ||
      !form.nombre_contacto
    ) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Email inválido");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/registros-cancha", {
        ...form,
        num_canchas: Number(form.num_canchas),
      });
      setDone(r.data);
      toast.success("¡Solicitud enviada exitosamente!");
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Error al enviar la solicitud",
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className="bg-white border border-[#E8F3E4] rounded-3xl p-8 text-center"
        data-testid="registro-success"
      >
        <CheckCircle2 size={64} className="mx-auto text-[#1F4D2A]" />
        <h2 className="font-display text-3xl font-black text-[#1F4D2A] mt-4">
          ¡Solicitud recibida!
        </h2>
        <p className="text-[#4B5563] mt-3 max-w-xl mx-auto">
          Recibimos tu solicitud para afiliar{" "}
          <strong>{done.nombre_local}</strong>. Nuestro equipo revisará tus
          datos y te contactará en las próximas 24-48 horas al correo{" "}
          <strong>{done.email}</strong>.
        </p>
        <div className="mt-5 bg-[#E8F3E4] rounded-2xl p-4 inline-block">
          <div className="text-xs text-[#1F4D2A]">N° de solicitud</div>
          <div
            className="font-mono font-bold text-[#1F4D2A]"
            data-testid="registro-id"
          >
            {done.id.slice(0, 8).toUpperCase()}
          </div>
          <div className="text-xs mt-2 inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
            <Clock size={12} /> Pendiente de revisión
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => {
              setDone(null);
              setForm({
                nombre_local: "",
                direccion: "",
                telefono: "",
                email: "",
                nombre_contacto: "",
                num_canchas: 1,
                mensaje: "",
              });
            }}
            className="pill-btn-outline text-sm"
          >
            Enviar otra
          </button>
          <button
            onClick={() => navigate("/")}
            className="pill-btn text-sm"
            data-testid="back-home-btn"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#E8F3E4] rounded-3xl p-6 md:p-8 space-y-4"
      data-testid="registro-form"
    >
      <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">
        Datos del local
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Nombre del local *</Label>
          <Input
            value={form.nombre_local}
            onChange={(e) => setForm({ ...form, nombre_local: e.target.value })}
            required
            data-testid="input-nombre-local"
          />
        </div>
        <div>
          <Label>Nombre del contacto *</Label>
          <Input
            value={form.nombre_contacto}
            onChange={(e) =>
              setForm({ ...form, nombre_contacto: e.target.value })
            }
            required
            data-testid="input-nombre-contacto"
          />
        </div>
      </div>
      <div>
        <Label>Dirección del local *</Label>
        <Input
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          placeholder="Ej: Cra. 53 #76-30, Riomar, Barranquilla"
          required
          data-testid="input-direccion"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            data-testid="input-email"
          />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="+57 300 000 0000"
            data-testid="input-telefono"
          />
        </div>
        <div>
          <Label>N° de canchas</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={form.num_canchas}
            onChange={(e) => setForm({ ...form, num_canchas: e.target.value })}
            data-testid="input-num-canchas"
          />
        </div>
      </div>
      <div>
        <Label>Cuéntanos más (opcional)</Label>
        <Textarea
          rows={4}
          value={form.mensaje}
          onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
          placeholder="Tipos de cancha (F5, F7, F8, F11), servicios adicionales, horarios..."
          data-testid="input-mensaje"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="pill-btn-dark w-full justify-center text-base disabled:opacity-50"
        data-testid="submit-registro"
      >
        {loading ? "Enviando..." : "Enviar solicitud"}{" "}
        <ArrowUpRight size={18} />
      </button>
      <p className="text-xs text-[#4B5563] text-center">
        Al enviar este formulario aceptas nuestros Términos y Condiciones de
        afiliación.
      </p>
    </form>
  );
}

function ConsultaRegistro() {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);

  const consultar = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const r = await api.get(
        `/registros-cancha/by-email/${encodeURIComponent(email)}`,
      );
      setItems(r.data);
    } catch {
      toast.error("Error consultando");
    } finally {
      setLoading(false);
    }
  };

  const estadoBadge = (estado) => {
    if (estado === "aprobado")
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-[#D4E8C9] text-[#1F4D2A] font-semibold inline-flex items-center gap-1">
          <Check size={12} /> Aprobado
        </span>
      );
    if (estado === "rechazado")
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold inline-flex items-center gap-1">
          <X size={12} /> Rechazado
        </span>
      );
    return (
      <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold inline-flex items-center gap-1">
        <Clock size={12} /> Pendiente
      </span>
    );
  };

  return (
    <div
      className="bg-white border border-[#E8F3E4] rounded-3xl p-6 md:p-8 space-y-4"
      data-testid="consulta-form"
    >
      <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">
        Consulta el estado de tu solicitud
      </h2>
      <form onSubmit={consultar} className="flex gap-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email registrado"
          required
          className="flex-1"
          data-testid="consulta-email"
        />
        <button
          type="submit"
          disabled={loading}
          className="pill-btn text-sm disabled:opacity-50"
          data-testid="consulta-btn"
        >
          <Search size={16} /> {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>
      {items && (
        <div className="space-y-3 mt-3" data-testid="consulta-results">
          {items.length === 0 && (
            <p className="text-sm text-[#4B5563] text-center py-6">
              No encontramos solicitudes con ese email.
            </p>
          )}
          {items.map((it) => (
            <div key={it.id} className="bg-[#E8F3E4] rounded-2xl p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-display font-bold text-[#1F4D2A]">
                    {it.nombre_local}
                  </h3>
                  <p className="text-xs text-[#4B5563]">{it.direccion}</p>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Solicitud #{it.id.slice(0, 8).toUpperCase()} ·{" "}
                    {it.num_canchas} cancha(s)
                  </p>
                </div>
                {estadoBadge(it.estado)}
              </div>
              {it.estado === "aprobado" && (
                <p className="text-xs text-[#1F4D2A] mt-2">
                  ¡Tu local ya está en OutSide! Nuestro equipo te contactará
                  para configurar precios y horarios.
                </p>
              )}
              {it.estado === "rechazado" && (
                <p className="text-xs text-red-700 mt-2">
                  Tu solicitud no pudo ser aprobada. Para más información
                  contáctanos al hola@outside.com.co
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
