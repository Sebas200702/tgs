import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Edit, Trash2, Building2, MapPin, Trophy, Ticket, ClipboardList } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="admin-page">
      <h1 className="font-display text-4xl font-black text-[#1F4D2A] mb-2">Panel de Administración</h1>
      <p className="text-[#4B5563] mb-8">Gestiona canchas, locales, reservas, torneos y descuentos.</p>

      <Tabs defaultValue="locales" className="w-full">
        <TabsList className="bg-[#E8F3E4] flex-wrap h-auto">
          <TabsTrigger value="locales" data-testid="tab-locales"><Building2 size={16} className="mr-2" /> Locales</TabsTrigger>
          <TabsTrigger value="canchas" data-testid="tab-canchas"><MapPin size={16} className="mr-2" /> Canchas</TabsTrigger>
          <TabsTrigger value="reservas" data-testid="tab-reservas"><ClipboardList size={16} className="mr-2" /> Reservas</TabsTrigger>
          <TabsTrigger value="torneos" data-testid="tab-torneos"><Trophy size={16} className="mr-2" /> Torneos</TabsTrigger>
          <TabsTrigger value="descuentos" data-testid="tab-descuentos"><Ticket size={16} className="mr-2" /> Descuentos</TabsTrigger>
        </TabsList>
        <TabsContent value="locales"><LocalesAdmin /></TabsContent>
        <TabsContent value="canchas"><CanchasAdmin /></TabsContent>
        <TabsContent value="reservas"><ReservasAdmin /></TabsContent>
        <TabsContent value="torneos"><TorneosAdmin /></TabsContent>
        <TabsContent value="descuentos"><DescuentosAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== LOCALES ====================
function LocalesAdmin() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", puntuacion: 5, reglamento: "", imagen: "" });

  const load = () => api.get("/locales").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ nombre: "", direccion: "", puntuacion: 5, reglamento: "", imagen: "" }); setOpen(true); };
  const openEdit = (l) => { setEdit(l); setForm({ nombre: l.nombre, direccion: l.direccion, puntuacion: l.puntuacion, reglamento: (l.reglamento || []).join("\n"), imagen: l.imagen || "" }); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        nombre: form.nombre, direccion: form.direccion, puntuacion: parseFloat(form.puntuacion) || 5,
        reglamento: form.reglamento.split("\n").filter(Boolean), imagen: form.imagen,
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
                <p className="text-xs mt-1">★ {l.puntuacion}</p>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit ? "Editar Local" : "Nuevo Local"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="local-nombre" /></div>
            <div><Label>Dirección</Label><Input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} data-testid="local-direccion" /></div>
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
function CanchasAdmin() {
  const [items, setItems] = useState([]);
  const [locales, setLocales] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio_base: 100, local_id: "", largo: 40, ancho: 20, imagen: "" });

  const load = () => Promise.all([api.get("/canchas"), api.get("/locales")]).then(([a, b]) => { setItems(a.data); setLocales(b.data); });
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ nombre: "", descripcion: "", precio_base: 100, local_id: locales[0]?.id || "", largo: 40, ancho: 20, imagen: "" }); setOpen(true); };
  const openEdit = (c) => { setEdit(c); setForm({ nombre: c.nombre, descripcion: c.descripcion, precio_base: c.precio_base, local_id: c.local_id, largo: c.dimensiones?.largo || 40, ancho: c.dimensiones?.ancho || 20, imagen: c.imagenes?.[0] || "" }); setOpen(true); };

  const handleUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try { const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }});
      // Build full URL from backend
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
              <p className="text-sm mt-1">${c.precio_base}</p>
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
            <div><Label>Precio base</Label><Input type="number" value={form.precio_base} onChange={e => setForm({...form, precio_base: e.target.value})} data-testid="cancha-precio" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Largo (m)</Label><Input type="number" value={form.largo} onChange={e => setForm({...form, largo: e.target.value})} /></div>
              <div><Label>Ancho (m)</Label><Input type="number" value={form.ancho} onChange={e => setForm({...form, ancho: e.target.value})} /></div>
            </div>
            <div><Label>Descripción</Label><Textarea rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
            <div><Label>Imagen</Label>
              <input type="file" accept="image/*" onChange={handleUpload} className="text-sm" data-testid="cancha-image-input" />
              {form.imagen && <img src={form.imagen} alt="" className="w-full h-32 object-cover rounded-xl mt-2" />}
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
  return (
    <div className="mt-6">
      <h2 className="font-display text-2xl font-bold text-[#1F4D2A] mb-5">Reservas</h2>
      <div className="bg-white border border-[#E8F3E4] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#E8F3E4]"><tr><th className="text-left p-3">Cancha</th><th className="text-left p-3">Usuario</th><th className="text-left p-3">Fecha</th><th className="text-left p-3">Hora</th><th className="text-left p-3">Precio</th><th className="text-left p-3">Estado</th></tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-t border-[#E8F3E4]" data-testid={`admin-reserva-${r.id}`}>
                <td className="p-3">{r.cancha?.nombre}</td>
                <td className="p-3">{r.user?.email}</td>
                <td className="p-3">{r.fecha}</td>
                <td className="p-3">{r.hora}</td>
                <td className="p-3">${r.precio?.toFixed(2)}</td>
                <td className="p-3">
                  {r.cancelada ? "Cancelada" : r.confirmada ? "Confirmada" : "Pendiente"}
                  {r.payment_status === "paid" && " · Pagada"}
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
  const [form, setForm] = useState({ nombre: "", descripcion: "", tipo: "liga", abierto: true, fecha_inicio: "", imagen: "" });
  const load = () => api.get("/torneos").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  const openNew = () => { setEdit(null); setForm({ nombre: "", descripcion: "", tipo: "liga", abierto: true, fecha_inicio: "", imagen: "" }); setOpen(true); };
  const openEdit = (t) => { setEdit(t); setForm({ nombre: t.nombre, descripcion: t.descripcion, tipo: t.tipo, abierto: t.abierto, fecha_inicio: t.fecha_inicio || "", imagen: t.imagen || "" }); setOpen(true); };
  const save = async () => {
    try {
      const payload = { ...form, sedes: [] };
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
                <p className="text-xs text-[#4B5563]">{t.tipo} · {t.equipos_count || 0} equipos · {t.abierto ? "Abierto" : "Cerrado"}</p>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Editar Torneo" : "Nuevo Torneo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="torneo-nombre" /></div>
            <div><Label>Descripción</Label><Textarea rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
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
            <div><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} /></div>
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
      if (form.tipo.includes("fecha")) { condicion.fecha_inicio = form.fecha_inicio; condicion.fecha_final = form.fecha_final; }
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
        <h2 className="font-display text-2xl font-bold text-[#1F4D2A]">Descuentos</h2>
        <button onClick={openNew} className="pill-btn-dark text-sm" data-testid="new-descuento-btn"><Plus size={16} /> Nuevo Descuento</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(d => (
          <div key={d.id} className="bg-white border border-[#E8F3E4] rounded-2xl p-5" data-testid={`admin-descuento-${d.id}`}>
            <div className="flex justify-between">
              <div>
                <h3 className="font-display font-bold text-[#1F4D2A]">{d.nombre} · {d.porcentaje}%</h3>
                <p className="text-xs text-[#4B5563]">{d.condicion?.tipo} · {d.vigente ? "Vigente" : "Inactivo"}</p>
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
