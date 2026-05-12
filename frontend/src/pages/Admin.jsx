import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Edit, Trash2, Building2, MapPin, Trophy, Ticket, ClipboardList, BarChart3, FileDown, Inbox, Check, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatCOP } from "../lib/format";

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="admin-page">
      <h1 className="font-display text-4xl font-black text-[#1F4D2A] mb-2">Panel de Administración</h1>
      <p className="text-[#4B5563] mb-8">Gestiona canchas, locales, reservas, torneos y descuentos.</p>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="bg-[#E8F3E4] flex-wrap h-auto gap-1">
          <TabsTrigger value="stats" data-testid="tab-stats"><BarChart3 size={16} className="mr-2" /> Estadísticas</TabsTrigger>
          <TabsTrigger value="locales" data-testid="tab-locales"><Building2 size={16} className="mr-2" /> Locales</TabsTrigger>
          <TabsTrigger value="canchas" data-testid="tab-canchas"><MapPin size={16} className="mr-2" /> Canchas</TabsTrigger>
          <TabsTrigger value="reservas" data-testid="tab-reservas"><ClipboardList size={16} className="mr-2" /> Reservas</TabsTrigger>
          <TabsTrigger value="torneos" data-testid="tab-torneos"><Trophy size={16} className="mr-2" /> Torneos</TabsTrigger>
          <TabsTrigger value="descuentos" data-testid="tab-descuentos"><Ticket size={16} className="mr-2" /> Descuentos</TabsTrigger>
          <TabsTrigger value="registros" data-testid="tab-registros"><Inbox size={16} className="mr-2" /> Solicitudes</TabsTrigger>
        </TabsList>
        <TabsContent value="stats"><StatsAdmin /></TabsContent>
        <TabsContent value="locales"><LocalesAdmin /></TabsContent>
        <TabsContent value="canchas"><CanchasAdmin /></TabsContent>
        <TabsContent value="reservas"><ReservasAdmin /></TabsContent>
        <TabsContent value="torneos"><TorneosAdmin /></TabsContent>
        <TabsContent value="descuentos"><DescuentosAdmin /></TabsContent>
        <TabsContent value="registros"><RegistrosAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== STATS ====================
function StatsAdmin() {
  const [horas, setHoras] = useState([]);
  const [ingresos, setIngresos] = useState(null);
  useEffect(() => {
    api.get("/stats/horas").then(r => setHoras(r.data.horas || []));
    api.get("/stats/ingresos").then(r => setIngresos(r.data));
  }, []);

  const maxTotal = Math.max(...horas.map(h => h.total), 1);
  const mostReq = horas[0];
  const leastReq = horas[horas.length - 1];

  const exportCSV = () => {
    // session_token cookie is httpOnly but sent automatically on same-origin window.open
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/reservas/export.csv`;
    window.open(url, "_blank");
  };

  return (
    <div className="mt-6" data-testid="stats-admin">
      <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Estadísticas operativas</h2>
        <button onClick={exportCSV} className="pill-btn-dark text-sm" data-testid="export-csv-btn">
          <FileDown size={16} /> Exportar reservas (CSV)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
          <div className="text-xs text-[#4B5563]">Total Reservas</div>
          <div className="font-display text-3xl font-black text-[#1F4D2A] mt-1">{ingresos?.total_reservas ?? "—"}</div>
        </div>
        <div className="bg-white border border-[#E8F3E4] rounded-2xl p-5">
          <div className="text-xs text-[#4B5563]">Reservas pagadas</div>
          <div className="font-display text-3xl font-black text-[#1F4D2A] mt-1">{ingresos?.total_pagadas ?? "—"}</div>
        </div>
        <div className="bg-[#D4E8C9] border border-[#E8F3E4] rounded-2xl p-5">
          <div className="text-xs text-[#1F4D2A]">Ingresos potenciales</div>
          <div className="font-display text-2xl font-black text-[#1F4D2A] mt-1">{ingresos ? formatCOP(ingresos.ingresos_potenciales) : "—"}</div>
        </div>
        <div className="bg-[#1F4D2A] text-white rounded-2xl p-5">
          <div className="text-xs text-white/80">Ingresos confirmados</div>
          <div className="font-display text-2xl font-black mt-1">{ingresos ? formatCOP(ingresos.ingresos_confirmados) : "—"}</div>
        </div>
      </div>

      {/* Hours chart */}
      <div className="bg-white border border-[#E8F3E4] rounded-3xl p-6">
        <h3 className="font-display text-xl font-bold text-[#1F4D2A] mb-4">Horas más solicitadas</h3>
        {horas.length === 0 ? (
          <p className="text-[#4B5563] text-sm">Aún no hay datos suficientes. Cuando los usuarios reserven se llenará este gráfico.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#D4E8C9] rounded-2xl p-4">
                <div className="text-xs text-[#1F4D2A]">Más solicitada</div>
                <div className="font-display text-2xl font-bold">{mostReq?.hora} <span className="text-sm font-normal">({mostReq?.total} reservas)</span></div>
              </div>
              <div className="bg-[#E8F3E4] rounded-2xl p-4">
                <div className="text-xs text-[#1F4D2A]">Menos solicitada</div>
                <div className="font-display text-2xl font-bold">{leastReq?.hora} <span className="text-sm font-normal">({leastReq?.total} reservas)</span></div>
              </div>
            </div>
            <div className="space-y-2" data-testid="horas-chart">
              {horas.map(h => (
                <div key={h.hora} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-semibold text-[#1F4D2A]">{h.hora}</div>
                  <div className="flex-1 bg-[#E8F3E4] rounded-full h-6 overflow-hidden">
                    <div className="bg-[#1F4D2A] h-full rounded-full flex items-center justify-end px-3 text-white text-xs font-bold transition-all"
                      style={{ width: `${(h.total / maxTotal) * 100}%` }}>
                      {h.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== LOCALES ====================
function LocalesAdmin() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", puntuacion: 5, reglamento: "", imagen: "", lat: "", lng: "", como_llegar: "", telefono: "", horario: "" });

  const load = () => api.get("/locales").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ nombre: "", direccion: "", puntuacion: 5, reglamento: "", imagen: "", lat: "", lng: "", como_llegar: "", telefono: "", horario: "" }); setOpen(true); };
  const openEdit = (l) => { setEdit(l); setForm({
    nombre: l.nombre, direccion: l.direccion, puntuacion: l.puntuacion,
    reglamento: (l.reglamento || []).join("\n"), imagen: l.imagen || "",
    lat: l.lat || "", lng: l.lng || "", como_llegar: l.como_llegar || "",
    telefono: l.telefono || "", horario: l.horario || "",
  }); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        nombre: form.nombre, direccion: form.direccion, puntuacion: parseFloat(form.puntuacion) || 5,
        reglamento: form.reglamento.split("\n").filter(Boolean), imagen: form.imagen,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        como_llegar: form.como_llegar, telefono: form.telefono, horario: form.horario,
        puntos_referencia: edit?.puntos_referencia || [],
        precios_por_dia: edit?.precios_por_dia || [], precios_por_hora: edit?.precios_por_hora || [],
      };
      if (edit) await api.put(`/locales/${edit.id}`, payload);
      else await api.post("/locales", payload);
      toast.success("Guardado"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };
  const del = async (id) => { if (!window.confirm("¿Eliminar local?")) return; await api.delete(`/locales/${id}`); toast.success("Eliminado"); load(); };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Locales</h2>
        <button onClick={openNew} className="pill-btn-dark text-sm" data-testid="new-local-btn"><Plus size={16} /> Nuevo Local</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(l => (
          <div key={l.id} className="bg-white border border-[#E8F3E4] rounded-2xl p-5" data-testid={`local-${l.id}`}>
            <div className="flex justify-between">
              <div>
                <h3 className="font-display font-bold text-[#1F4D2A]">{l.nombre}</h3>
                <p className="text-xs text-[#4B5563]">{l.direccion}</p>
                <p className="text-xs mt-1">★ {l.puntuacion} · {l.lat && l.lng ? `📍 ${l.lat}, ${l.lng}` : "Sin geo"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(l)} className="p-2 hover:bg-[#E8F3E4] rounded-full"><Edit size={14} /></button>
                <button onClick={() => del(l.id)} className="p-2 hover:bg-red-100 rounded-full text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? "Editar Local" : "Nuevo Local"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="local-nombre" /></div>
            <div><Label>Dirección</Label><Input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} data-testid="local-direccion" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitud</Label><Input type="number" step="any" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} placeholder="11.0156" data-testid="local-lat" /></div>
              <div><Label>Longitud</Label><Input type="number" step="any" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} placeholder="-74.8278" data-testid="local-lng" /></div>
            </div>
            <div><Label>Teléfono</Label><Input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} /></div>
            <div><Label>Horario</Label><Input value={form.horario} onChange={e => setForm({...form, horario: e.target.value})} /></div>
            <div><Label>Cómo llegar</Label><Textarea rows={2} value={form.como_llegar} onChange={e => setForm({...form, como_llegar: e.target.value})} /></div>
            <div><Label>Puntuación</Label><Input type="number" step="0.1" value={form.puntuacion} onChange={e => setForm({...form, puntuacion: e.target.value})} /></div>
            <div><Label>Imagen (URL)</Label><Input value={form.imagen} onChange={e => setForm({...form, imagen: e.target.value})} /></div>
            <div><Label>Reglamento (una regla por línea)</Label><Textarea rows={4} value={form.reglamento} onChange={e => setForm({...form, reglamento: e.target.value})} /></div>
            <button onClick={save} className="pill-btn-dark w-full justify-center" data-testid="save-local">Guardar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== CANCHAS ====================
const ITEMS_LIST = [
  ["acepta_ninos", "Acepta niños"],
  ["acepta_mascotas", "Acepta mascotas"],
  ["parqueadero", "Parqueadero"],
  ["vestidores", "Vestidores"],
  ["iluminacion", "Iluminación"],
  ["cafeteria", "Cafetería"],
  ["duchas", "Duchas"],
  ["arbitro_incluido", "Árbitro incluido"],
];

function CanchasAdmin() {
  const [items, setItems] = useState([]);
  const [locales, setLocales] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const defaultItems = Object.fromEntries(ITEMS_LIST.map(([k]) => [k, false]));
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio_base: 100000, local_id: "", largo: 40, ancho: 20, imagen: "", items: { ...defaultItems } });

  const load = () => Promise.all([api.get("/canchas"), api.get("/locales")]).then(([a, b]) => { setItems(a.data); setLocales(b.data); });
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ nombre: "", descripcion: "", precio_base: 100000, local_id: locales[0]?.id || "", largo: 40, ancho: 20, imagen: "", items: { ...defaultItems } }); setOpen(true); };
  const openEdit = (c) => {
    setEdit(c);
    setForm({
      nombre: c.nombre, descripcion: c.descripcion, precio_base: c.precio_base,
      local_id: c.local_id, largo: c.dimensiones?.largo || 40, ancho: c.dimensiones?.ancho || 20,
      imagen: c.imagenes?.[0] || "",
      items: { ...defaultItems, ...(c.items || {}) },
    });
    setOpen(true);
  };

  const handleUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try { const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }});
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      setForm({...form, imagen: url}); toast.success("Imagen subida");
    } catch { toast.error("Error subiendo imagen"); }
  };

  const save = async () => {
    try {
      const payload = {
        nombre: form.nombre, descripcion: form.descripcion, precio_base: parseFloat(form.precio_base),
        local_id: form.local_id,
        dimensiones: { largo: parseFloat(form.largo), ancho: parseFloat(form.ancho), arco_alto: 2, arco_ancho: 3 },
        imagenes: form.imagen ? [form.imagen] : [],
        items: form.items,
      };
      if (edit) await api.put(`/canchas/${edit.id}`, payload);
      else await api.post("/canchas", payload);
      toast.success("Guardado"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };
  const del = async (id) => { if (!window.confirm("¿Eliminar cancha?")) return; await api.delete(`/canchas/${id}`); toast.success("Eliminada"); load(); };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Canchas</h2>
        <button onClick={openNew} className="pill-btn-dark text-sm" data-testid="new-cancha-btn"><Plus size={16} /> Nueva Cancha</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(c => (
          <div key={c.id} className="bg-white border border-[#E8F3E4] rounded-2xl overflow-hidden" data-testid={`admin-cancha-${c.id}`}>
            {c.imagenes?.[0] && <img src={c.imagenes[0]} alt="" className="w-full h-32 object-cover" />}
            <div className="p-4">
              <h3 className="font-display font-bold text-[#1F4D2A]">{c.nombre}</h3>
              <p className="text-xs text-[#4B5563]">{c.local?.nombre}</p>
              <p className="text-sm mt-1 font-bold">{formatCOP(c.precio_base, false)}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(c)} className="text-xs p-2 hover:bg-[#E8F3E4] rounded-full"><Edit size={14} /></button>
                <button onClick={() => del(c.id)} className="text-xs p-2 hover:bg-red-100 rounded-full text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? "Editar Cancha" : "Nueva Cancha"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="cancha-nombre" /></div>
            <div><Label>Local</Label>
              <Select value={form.local_id} onValueChange={v => setForm({...form, local_id: v})}>
                <SelectTrigger data-testid="cancha-local-select"><SelectValue placeholder="Selecciona local" /></SelectTrigger>
                <SelectContent>{locales.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Precio base (COP)</Label><Input type="number" value={form.precio_base} onChange={e => setForm({...form, precio_base: e.target.value})} data-testid="cancha-precio" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Largo (m)</Label><Input type="number" value={form.largo} onChange={e => setForm({...form, largo: e.target.value})} /></div>
              <div><Label>Ancho (m)</Label><Input type="number" value={form.ancho} onChange={e => setForm({...form, ancho: e.target.value})} /></div>
            </div>
            <div><Label>Descripción</Label><Textarea rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
            <div><Label>Imagen</Label>
              <input type="file" accept="image/*" onChange={handleUpload} className="text-sm" data-testid="cancha-image-input" />
              {form.imagen && <img src={form.imagen} alt="" className="w-full h-32 object-cover rounded-xl mt-2" />}
            </div>
            <div>
              <Label>Ítems / Servicios</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ITEMS_LIST.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm" data-testid={`item-${key}`}>
                    <Checkbox checked={!!form.items[key]} onCheckedChange={v => setForm({...form, items: {...form.items, [key]: !!v}})} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={save} className="pill-btn-dark w-full justify-center" data-testid="save-cancha">Guardar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== RESERVAS ====================
function ReservasAdmin() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/reservas").then(r => setItems(r.data)); }, []);
  const exportCSV = () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/reservas/export.csv`;
    window.open(url, "_blank");
  };
  return (
    <div className="mt-6">
      <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Reservas</h2>
        <button onClick={exportCSV} className="pill-btn-dark text-sm" data-testid="export-reservas-csv"><FileDown size={16} /> Exportar CSV</button>
      </div>
      <div className="bg-white border border-[#E8F3E4] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-[#E8F3E4]"><tr>
            <th className="text-left p-3">Cancha</th><th className="text-left p-3">Usuario</th>
            <th className="text-left p-3">Fecha</th><th className="text-left p-3">Hora</th>
            <th className="text-left p-3">Precio</th><th className="text-left p-3">Estado</th>
          </tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-t border-[#E8F3E4]" data-testid={`admin-reserva-${r.id}`}>
                <td className="p-3">{r.cancha?.nombre}</td>
                <td className="p-3">{r.user?.email}</td>
                <td className="p-3">{r.fecha}</td>
                <td className="p-3">{r.hora}</td>
                <td className="p-3 font-semibold">{formatCOP(r.precio, false)}</td>
                <td className="p-3 text-xs">
                  {r.cancelada ? "❌ Cancelada" : r.confirmada ? "✅ Confirmada" : "⏳ Pendiente"}
                  {r.payment_status === "paid" && " · 💳 Pagada"}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="p-5 text-center text-[#4B5563]" colSpan="6">Sin reservas aún.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== TORNEOS ====================
function TorneosAdmin() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", tipo: "liga", categoria: "Senior", abierto: true, fecha_inicio: "", imagen: "", cupo_maximo: 16 });
  const load = () => api.get("/torneos").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  const openNew = () => { setEdit(null); setForm({ nombre: "", descripcion: "", tipo: "liga", categoria: "Senior", abierto: true, fecha_inicio: "", imagen: "", cupo_maximo: 16 }); setOpen(true); };
  const openEdit = (t) => { setEdit(t); setForm({ nombre: t.nombre, descripcion: t.descripcion, tipo: t.tipo, categoria: t.categoria || "Senior", abierto: t.abierto, fecha_inicio: t.fecha_inicio || "", imagen: t.imagen || "", cupo_maximo: t.cupo_maximo || 16 }); setOpen(true); };
  const save = async () => {
    try {
      const payload = { ...form, sedes: [], cupo_maximo: parseInt(form.cupo_maximo) || 16 };
      if (edit) await api.put(`/torneos/${edit.id}`, payload);
      else await api.post("/torneos", payload);
      toast.success("Guardado"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };
  const del = async (id) => { if (!window.confirm("¿Eliminar torneo?")) return; await api.delete(`/torneos/${id}`); toast.success("Eliminado"); load(); };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Torneos</h2>
        <button onClick={openNew} className="pill-btn-dark text-sm" data-testid="new-torneo-btn"><Plus size={16} /> Nuevo Torneo</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(t => (
          <div key={t.id} className="bg-white border border-[#E8F3E4] rounded-2xl p-5" data-testid={`admin-torneo-${t.id}`}>
            <div className="flex justify-between">
              <div>
                <h3 className="font-display font-bold text-[#1F4D2A]">{t.nombre}</h3>
                <p className="text-xs text-[#4B5563]">{t.tipo} · <span className="font-semibold">{t.categoria}</span> · {t.equipos_count || 0}/{t.cupo_maximo || "?"} equipos · {t.abierto ? "Abierto" : "Cerrado"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(t)} className="p-2 hover:bg-[#E8F3E4] rounded-full"><Edit size={14} /></button>
                <button onClick={() => del(t.id)} className="p-2 hover:bg-red-100 rounded-full text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? "Editar Torneo" : "Nuevo Torneo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="torneo-nombre" /></div>
            <div><Label>Descripción</Label><Textarea rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liga">Liga</SelectItem>
                    <SelectItem value="eliminación directa">Eliminación directa</SelectItem>
                    <SelectItem value="copa">Copa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Categoría</Label>
                <Select value={form.categoria} onValueChange={v => setForm({...form, categoria: v})}>
                  <SelectTrigger data-testid="torneo-categoria"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Infantil">Infantil (8-12)</SelectItem>
                    <SelectItem value="Juvenil">Juvenil (13-17)</SelectItem>
                    <SelectItem value="Senior">Senior (18+)</SelectItem>
                    <SelectItem value="Veteranos">Veteranos (35+)</SelectItem>
                    <SelectItem value="Mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} /></div>
              <div><Label>Cupo máximo</Label><Input type="number" value={form.cupo_maximo} onChange={e => setForm({...form, cupo_maximo: e.target.value})} /></div>
            </div>
            <div><Label>Imagen (URL)</Label><Input value={form.imagen} onChange={e => setForm({...form, imagen: e.target.value})} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.abierto} onCheckedChange={v => setForm({...form, abierto: v})} /> <Label>Abierto a postulaciones</Label></div>
            <button onClick={save} className="pill-btn-dark w-full justify-center" data-testid="save-torneo">Guardar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== DESCUENTOS ====================
function DescuentosAdmin() {
  const [items, setItems] = useState([]);
  const [locales, setLocales] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const empty = { local_id: "", nombre: "", porcentaje: 10, vigente: true, tipo: "rango-fecha", fecha_inicio: "", fecha_final: "", hora_inicio: "", hora_final: "", fecha: "", hora: "" };
  const [form, setForm] = useState(empty);

  const load = () => Promise.all([api.get("/descuentos"), api.get("/locales")]).then(([a, b]) => { setItems(a.data); setLocales(b.data); });
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ ...empty, local_id: locales[0]?.id || "" }); setOpen(true); };
  const openEdit = (d) => {
    setEdit(d);
    setForm({
      local_id: d.local_id, nombre: d.nombre, porcentaje: d.porcentaje, vigente: d.vigente,
      tipo: d.condicion?.tipo || "rango-fecha",
      fecha_inicio: d.condicion?.fecha_inicio || "", fecha_final: d.condicion?.fecha_final || "",
      hora_inicio: d.condicion?.hora_inicio || "", hora_final: d.condicion?.hora_final || "",
      fecha: d.condicion?.fecha || "", hora: d.condicion?.hora || "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const condicion = { tipo: form.tipo };
      if (form.tipo.includes("fecha") && form.tipo !== "fecha-hora-exacta") { condicion.fecha_inicio = form.fecha_inicio; condicion.fecha_final = form.fecha_final; }
      if (form.tipo.includes("hora") && form.tipo !== "fecha-hora-exacta") { condicion.hora_inicio = form.hora_inicio; condicion.hora_final = form.hora_final; }
      if (form.tipo === "fecha-hora-exacta") { condicion.fecha = form.fecha; condicion.hora = form.hora; }
      const payload = { local_id: form.local_id, nombre: form.nombre, porcentaje: parseFloat(form.porcentaje), vigente: form.vigente, condicion };
      if (edit) await api.put(`/descuentos/${edit.id}`, payload);
      else await api.post("/descuentos", payload);
      toast.success("Guardado"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };
  const del = async (id) => { if (!window.confirm("¿Eliminar descuento?")) return; await api.delete(`/descuentos/${id}`); toast.success("Eliminado"); load(); };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Descuentos / Promociones</h2>
        <button onClick={openNew} className="pill-btn-dark text-sm" data-testid="new-descuento-btn"><Plus size={16} /> Nuevo Descuento</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(d => (
          <div key={d.id} className="bg-white border border-[#E8F3E4] rounded-2xl p-5" data-testid={`admin-descuento-${d.id}`}>
            <div className="flex justify-between">
              <div>
                <h3 className="font-display font-bold text-[#1F4D2A]">{d.nombre} · {d.porcentaje}%</h3>
                <p className="text-xs text-[#4B5563]">{d.condicion?.tipo} · {d.vigente ? "✅ Vigente" : "❌ Inactivo"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-2 hover:bg-[#E8F3E4] rounded-full"><Edit size={14} /></button>
                <button onClick={() => del(d.id)} className="p-2 hover:bg-red-100 rounded-full text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? "Editar Descuento" : "Nuevo Descuento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Local</Label>
              <Select value={form.local_id} onValueChange={v => setForm({...form, local_id: v})}>
                <SelectTrigger data-testid="descuento-local"><SelectValue placeholder="Selecciona local" /></SelectTrigger>
                <SelectContent>{locales.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="descuento-nombre" /></div>
            <div><Label>Porcentaje</Label><Input type="number" value={form.porcentaje} onChange={e => setForm({...form, porcentaje: e.target.value})} data-testid="descuento-porcentaje" /></div>
            <div><Label>Tipo de validez</Label>
              <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rango-fecha">Rango de fechas</SelectItem>
                  <SelectItem value="rango-hora">Rango de horas</SelectItem>
                  <SelectItem value="rango-fecha-hora">Rango fecha y hora</SelectItem>
                  <SelectItem value="fecha-hora-exacta">Fecha y hora exacta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo.includes("fecha") && form.tipo !== "fecha-hora-exacta" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} /></div>
                <div><Label>Fecha final</Label><Input type="date" value={form.fecha_final} onChange={e => setForm({...form, fecha_final: e.target.value})} /></div>
              </div>
            )}
            {form.tipo.includes("hora") && form.tipo !== "fecha-hora-exacta" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Hora inicio</Label><Input type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} /></div>
                <div><Label>Hora final</Label><Input type="time" value={form.hora_final} onChange={e => setForm({...form, hora_final: e.target.value})} /></div>
              </div>
            )}
            {form.tipo === "fecha-hora-exacta" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} /></div>
                <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} /></div>
              </div>
            )}
            <div className="flex items-center gap-3"><Switch checked={form.vigente} onCheckedChange={v => setForm({...form, vigente: v})} /> <Label>Vigente</Label></div>
            <button onClick={save} className="pill-btn-dark w-full justify-center" data-testid="save-descuento">Guardar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== REGISTROS DE CANCHA ====================
function RegistrosAdmin() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/registros-cancha").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  const setEstado = async (id, estado) => {
    try { await api.put(`/registros-cancha/${id}/estado?estado=${estado}`); toast.success(`Solicitud ${estado}`); load(); }
    catch { toast.error("Error"); }
  };
  return (
    <div className="mt-6">
      <h2 className="font-display text-2xl font-bold text-[#1F4D2A] mb-5">Solicitudes de afiliación</h2>
      <div className="space-y-3">
        {items.map(r => (
          <div key={r.id} className="bg-white border border-[#E8F3E4] rounded-2xl p-5 flex flex-col md:flex-row gap-4" data-testid={`registro-${r.id}`}>
            <div className="flex-1">
              <h3 className="font-display font-bold text-[#1F4D2A]">{r.nombre_local}</h3>
              <p className="text-xs text-[#4B5563]">{r.direccion}</p>
              <p className="text-sm mt-1">Contacto: <strong>{r.nombre_contacto}</strong> · {r.email} · {r.telefono}</p>
              <p className="text-sm">N° canchas: {r.num_canchas}</p>
              {r.mensaje && <p className="text-sm mt-2 bg-[#E8F3E4] p-2 rounded-xl">{r.mensaje}</p>}
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                r.estado === "aprobado" ? "bg-[#D4E8C9] text-[#1F4D2A]" :
                r.estado === "rechazado" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>{r.estado}</span>
              {r.estado === "pendiente" && (
                <div className="flex gap-2">
                  <button onClick={() => setEstado(r.id, "aprobado")} data-testid={`aprobar-${r.id}`} className="pill-btn text-xs"><Check size={14} /> Aprobar</button>
                  <button onClick={() => setEstado(r.id, "rechazado")} data-testid={`rechazar-${r.id}`} className="pill-btn-outline text-xs"><X size={14} /> Rechazar</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-[#4B5563] py-10">No hay solicitudes pendientes.</p>}
      </div>
    </div>
  );
}
