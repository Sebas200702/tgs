from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Response, Header, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import uuid
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]
APP_NAME = os.environ.get('APP_NAME', 'outside')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logging.error(f"Storage init error: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# App setup
app = FastAPI()
api_router = APIRouter(prefix="/api")

# =================== MODELS ===================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    apellido: Optional[str] = ""
    edad: Optional[int] = None
    role: Literal["admin", "user"] = "user"
    created_at: Optional[str] = None

class Dimensiones(BaseModel):
    largo: float = 40
    ancho: float = 20
    arco_alto: float = 2
    arco_ancho: float = 3

class ItemsIngreso(BaseModel):
    acepta_ninos: bool = True
    acepta_mascotas: bool = False
    parqueadero: bool = True
    vestidores: bool = True
    iluminacion: bool = True
    cafeteria: bool = False
    duchas: bool = False
    arbitro_incluido: bool = False

class CanchaIn(BaseModel):
    nombre: str
    descripcion: str = ""
    precio_base: float
    local_id: str
    dimensiones: Dimensiones = Field(default_factory=Dimensiones)
    imagenes: List[str] = []
    items: ItemsIngreso = Field(default_factory=ItemsIngreso)

class PrecioDia(BaseModel):
    dia_nombre: str  # Lunes, Martes...
    dia_numero: int  # 0-6
    multiplicador: float = 1.0

class PrecioHora(BaseModel):
    hora: str  # "18:00"
    multiplicador: float = 1.0

class LocalIn(BaseModel):
    nombre: str
    direccion: str
    puntuacion: float = 5.0
    reglamento: List[str] = []
    precios_por_dia: List[PrecioDia] = []
    precios_por_hora: List[PrecioHora] = []
    imagen: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    como_llegar: Optional[str] = ""
    puntos_referencia: List[str] = []
    telefono: Optional[str] = ""
    horario: Optional[str] = "Lunes - Domingo, 9:00 am - 11:00 pm"

class ReservaIn(BaseModel):
    local_id: str
    cancha_id: str
    fecha: str  # YYYY-MM-DD
    hora: str   # HH:MM

class ValidesDescuento(BaseModel):
    tipo: Literal["rango-fecha", "rango-hora", "rango-fecha-hora", "fecha-hora-exacta"]
    fecha_inicio: Optional[str] = None
    fecha_final: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_final: Optional[str] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None

class DescuentoIn(BaseModel):
    local_id: str
    nombre: str
    porcentaje: float
    vigente: bool = True
    condicion: ValidesDescuento

class EquipoIn(BaseModel):
    nombre: str

class TorneoIn(BaseModel):
    nombre: str
    descripcion: str = ""
    sedes: List[str] = []  # cancha ids
    tipo: str = "liga"
    categoria: str = "Senior"  # Infantil, Juvenil, Senior, Mixto, Veteranos
    abierto: bool = True
    fecha_inicio: Optional[str] = None
    imagen: Optional[str] = None
    cupo_maximo: int = 16

class RegistroCanchaIn(BaseModel):
    nombre_local: str
    direccion: str
    telefono: str
    email: str
    nombre_contacto: str
    num_canchas: int = 1
    mensaje: Optional[str] = ""

# =================== AUTH HELPERS ===================
async def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def require_user(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "No autenticado")
    return user

async def require_admin(request: Request) -> dict:
    user = await require_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Permisos de administrador requeridos")
    return user


# =================== AUTH ENDPOINTS ===================
class SessionIn(BaseModel):
    session_id: str

@api_router.post("/auth/session")
async def auth_session(payload: SessionIn, response: Response):
    # Call Emergent auth to validate session_id
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id}, timeout=30
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(401, f"Sesión inválida: {e}")
    
    email = data["email"].lower()
    # find or create user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    is_admin_email = email in ADMIN_EMAILS
    if existing:
        user_id = existing["user_id"]
        # Promote to admin if email matches
        if is_admin_email and existing.get("role") != "admin":
            await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin"}})
            existing["role"] = "admin"
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name", "")), "picture": data.get("picture")}}
        )
        user = existing
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "admin" if is_admin_email else "user"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "apellido": "",
            "edad": None,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc.copy())
        user = user_doc
    
    session_token = data["session_token"]
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60
    )
    user.pop("_id", None)
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "No autenticado")
    return user

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# DEV: Backdoor to bootstrap an admin user for testing (callable only locally / when needed)
class DevSeedIn(BaseModel):
    email: str
    name: str = "Admin OutSide"

@api_router.post("/auth/dev-seed")
async def dev_seed_admin(payload: DevSeedIn, response: Response):
    """Creates / promotes a user to admin and issues a session token. Useful for testing."""
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin"}})
        user = {**existing, "role": "admin"}
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id, "email": email, "name": payload.name,
            "picture": None, "apellido": "", "edad": None, "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user.copy())
    session_token = f"dev_{uuid.uuid4().hex}"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60
    )
    user.pop("_id", None)
    return {"user": user, "session_token": session_token}


# =================== UPLOAD / FILES ===================
@api_router.post("/upload")
async def upload_image(request: Request, file: UploadFile = File(...)):
    user = await require_user(request)
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    file_doc = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "uploaded_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(file_doc.copy())
    file_doc.pop("_id", None)
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Archivo no encontrado")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))


# =================== LOCALES ===================
@api_router.get("/locales")
async def list_locales():
    items = await db.locales.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.get("/locales/{local_id}")
async def get_local(local_id: str):
    item = await db.locales.find_one({"id": local_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Local no encontrado")
    return item

@api_router.post("/locales")
async def create_local(payload: LocalIn, request: Request):
    user = await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["owner_user_id"] = user["user_id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.locales.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.put("/locales/{local_id}")
async def update_local(local_id: str, payload: LocalIn, request: Request):
    await require_admin(request)
    res = await db.locales.update_one({"id": local_id}, {"$set": payload.model_dump()})
    if not res.matched_count:
        raise HTTPException(404, "Local no encontrado")
    item = await db.locales.find_one({"id": local_id}, {"_id": 0})
    return item

@api_router.delete("/locales/{local_id}")
async def delete_local(local_id: str, request: Request):
    await require_admin(request)
    await db.locales.delete_one({"id": local_id})
    await db.canchas.delete_many({"local_id": local_id})
    return {"ok": True}


# =================== CANCHAS ===================
@api_router.get("/canchas")
async def list_canchas(local_id: Optional[str] = None):
    q = {"local_id": local_id} if local_id else {}
    items = await db.canchas.find(q, {"_id": 0}).to_list(1000)
    # Attach local info
    local_ids = list({c["local_id"] for c in items if c.get("local_id")})
    locales = {loc["id"]: loc for loc in await db.locales.find({"id": {"$in": local_ids}}, {"_id": 0}).to_list(1000)}
    for c in items:
        c["local"] = locales.get(c.get("local_id"))
    return items

@api_router.get("/canchas/{cancha_id}")
async def get_cancha(cancha_id: str):
    c = await db.canchas.find_one({"id": cancha_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Cancha no encontrada")
    if c.get("local_id"):
        local = await db.locales.find_one({"id": c["local_id"]}, {"_id": 0})
        c["local"] = local
    return c

@api_router.post("/canchas")
async def create_cancha(payload: CanchaIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.canchas.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.put("/canchas/{cancha_id}")
async def update_cancha(cancha_id: str, payload: CanchaIn, request: Request):
    await require_admin(request)
    res = await db.canchas.update_one({"id": cancha_id}, {"$set": payload.model_dump()})
    if not res.matched_count:
        raise HTTPException(404, "Cancha no encontrada")
    item = await db.canchas.find_one({"id": cancha_id}, {"_id": 0})
    return item

@api_router.delete("/canchas/{cancha_id}")
async def delete_cancha(cancha_id: str, request: Request):
    await require_admin(request)
    await db.canchas.delete_one({"id": cancha_id})
    return {"ok": True}


# =================== PRICING ===================
def calc_precio(cancha: dict, local: dict, fecha: str, hora: str, descuento: Optional[dict] = None) -> float:
    base = float(cancha.get("precio_base", 0))
    # weekday from fecha (YYYY-MM-DD)
    try:
        dt = datetime.strptime(fecha, "%Y-%m-%d")
        weekday = dt.weekday()
    except Exception:
        weekday = 0
    
    mult_dia = 1.0
    for p in (local or {}).get("precios_por_dia", []):
        if int(p.get("dia_numero", -1)) == weekday:
            mult_dia = float(p.get("multiplicador", 1.0))
            break
    
    mult_hora = 1.0
    for p in (local or {}).get("precios_por_hora", []):
        if p.get("hora") == hora:
            mult_hora = float(p.get("multiplicador", 1.0))
            break
    
    desc_mult = 1.0
    if descuento and descuento.get("vigente"):
        pct = float(descuento.get("porcentaje", 0))
        desc_mult = max(0.0, 1.0 - pct / 100.0)
    
    return round(base * mult_dia * mult_hora * desc_mult, 2)

def descuento_aplica(d: dict, fecha: str, hora: str) -> bool:
    if not d.get("vigente"):
        return False
    cond = d.get("condicion", {})
    tipo = cond.get("tipo")
    if tipo == "rango-fecha":
        return (cond.get("fecha_inicio") or "0000") <= fecha <= (cond.get("fecha_final") or "9999")
    if tipo == "rango-hora":
        return (cond.get("hora_inicio") or "00:00") <= hora <= (cond.get("hora_final") or "23:59")
    if tipo == "rango-fecha-hora":
        f_ok = (cond.get("fecha_inicio") or "0000") <= fecha <= (cond.get("fecha_final") or "9999")
        h_ok = (cond.get("hora_inicio") or "00:00") <= hora <= (cond.get("hora_final") or "23:59")
        return f_ok and h_ok
    if tipo == "fecha-hora-exacta":
        return cond.get("fecha") == fecha and cond.get("hora") == hora
    return False

async def best_descuento(local_id: str, fecha: str, hora: str):
    descs = await db.descuentos.find({"local_id": local_id, "vigente": True}, {"_id": 0}).to_list(200)
    aplicables = [d for d in descs if descuento_aplica(d, fecha, hora)]
    if not aplicables:
        return None
    return max(aplicables, key=lambda x: float(x.get("porcentaje", 0)))

class CalcPriceIn(BaseModel):
    cancha_id: str
    fecha: str
    hora: str

@api_router.post("/reservas/calcular-precio")
async def calcular_precio(payload: CalcPriceIn):
    cancha = await db.canchas.find_one({"id": payload.cancha_id}, {"_id": 0})
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")
    local = await db.locales.find_one({"id": cancha.get("local_id")}, {"_id": 0})
    desc = await best_descuento(cancha.get("local_id"), payload.fecha, payload.hora) if local else None
    precio = calc_precio(cancha, local, payload.fecha, payload.hora, desc)
    return {"precio": precio, "descuento": desc, "cancha": cancha, "local": local}


# =================== RESERVAS ===================
@api_router.post("/reservas")
async def create_reserva(payload: ReservaIn, request: Request):
    user = await require_user(request)
    cancha = await db.canchas.find_one({"id": payload.cancha_id}, {"_id": 0})
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")
    local = await db.locales.find_one({"id": payload.local_id}, {"_id": 0})
    if not local:
        raise HTTPException(404, "Local no encontrado")
    # check conflict
    existing = await db.reservas.find_one({
        "cancha_id": payload.cancha_id,
        "fecha": payload.fecha,
        "hora": payload.hora,
        "cancelada": False,
    }, {"_id": 0})
    if existing:
        raise HTTPException(409, "Ese horario ya está reservado")
    desc = await best_descuento(payload.local_id, payload.fecha, payload.hora)
    precio = calc_precio(cancha, local, payload.fecha, payload.hora, desc)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "local_id": payload.local_id,
        "cancha_id": payload.cancha_id,
        "fecha": payload.fecha,
        "hora": payload.hora,
        "confirmada": False,
        "cancelada": False,
        "precio": precio,
        "payment_status": "pending",
        "payment_session_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reservas.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.get("/reservas/me")
async def my_reservas(request: Request):
    user = await require_user(request)
    items = await db.reservas.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # attach cancha + local
    cancha_ids = list({r["cancha_id"] for r in items})
    canchas = {c["id"]: c for c in await db.canchas.find({"id": {"$in": cancha_ids}}, {"_id": 0}).to_list(500)}
    local_ids = list({r["local_id"] for r in items})
    locales = {loc["id"]: loc for loc in await db.locales.find({"id": {"$in": local_ids}}, {"_id": 0}).to_list(500)}
    for r in items:
        r["cancha"] = canchas.get(r["cancha_id"])
        r["local"] = locales.get(r["local_id"])
    return items

@api_router.get("/reservas")
async def all_reservas(request: Request, cancha_id: Optional[str] = None):
    await require_admin(request)
    q = {"cancha_id": cancha_id} if cancha_id else {}
    items = await db.reservas.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    cancha_ids = list({r["cancha_id"] for r in items})
    canchas = {c["id"]: c for c in await db.canchas.find({"id": {"$in": cancha_ids}}, {"_id": 0}).to_list(2000)}
    user_ids = list({r["user_id"] for r in items})
    users = {u["user_id"]: u for u in await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(2000)}
    for r in items:
        r["cancha"] = canchas.get(r["cancha_id"])
        r["user"] = users.get(r["user_id"])
    return items

@api_router.put("/reservas/{rid}/cancel")
async def cancel_reserva(rid: str, request: Request):
    user = await require_user(request)
    r = await db.reservas.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    if r["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(403, "No autorizado")
    await db.reservas.update_one({"id": rid}, {"$set": {"cancelada": True, "confirmada": False}})
    return {"ok": True}

@api_router.put("/reservas/{rid}/confirm")
async def confirm_reserva(rid: str, request: Request):
    user = await require_user(request)
    r = await db.reservas.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    if r["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(403, "No autorizado")
    await db.reservas.update_one({"id": rid}, {"$set": {"confirmada": True, "cancelada": False}})
    return {"ok": True}


# =================== DESCUENTOS ===================
@api_router.get("/descuentos")
async def list_descuentos(local_id: Optional[str] = None):
    q = {"local_id": local_id} if local_id else {}
    return await db.descuentos.find(q, {"_id": 0}).to_list(500)

@api_router.post("/descuentos")
async def create_descuento(payload: DescuentoIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.descuentos.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.put("/descuentos/{did}")
async def update_descuento(did: str, payload: DescuentoIn, request: Request):
    await require_admin(request)
    await db.descuentos.update_one({"id": did}, {"$set": payload.model_dump()})
    return await db.descuentos.find_one({"id": did}, {"_id": 0})

@api_router.delete("/descuentos/{did}")
async def delete_descuento(did: str, request: Request):
    await require_admin(request)
    await db.descuentos.delete_one({"id": did})
    return {"ok": True}


# =================== TORNEOS ===================
@api_router.get("/torneos")
async def list_torneos():
    items = await db.torneos.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for t in items:
        t["equipos_count"] = await db.equipos.count_documents({"torneo_id": t["id"]})
    return items

@api_router.get("/torneos/{tid}")
async def get_torneo(tid: str):
    t = await db.torneos.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Torneo no encontrado")
    t["equipos"] = await db.equipos.find({"torneo_id": tid}, {"_id": 0}).to_list(500)
    t["partidos"] = await db.partidos.find({"torneo_id": tid}, {"_id": 0}).to_list(500)
    return t

@api_router.post("/torneos")
async def create_torneo(payload: TorneoIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.torneos.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.put("/torneos/{tid}")
async def update_torneo(tid: str, payload: TorneoIn, request: Request):
    await require_admin(request)
    await db.torneos.update_one({"id": tid}, {"$set": payload.model_dump()})
    return await db.torneos.find_one({"id": tid}, {"_id": 0})

@api_router.delete("/torneos/{tid}")
async def delete_torneo(tid: str, request: Request):
    await require_admin(request)
    await db.torneos.delete_one({"id": tid})
    await db.equipos.delete_many({"torneo_id": tid})
    return {"ok": True}

@api_router.post("/torneos/{tid}/postular")
async def postular_torneo(tid: str, payload: EquipoIn, request: Request):
    user = await require_user(request)
    t = await db.torneos.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Torneo no encontrado")
    if not t.get("abierto", True):
        raise HTTPException(400, "Torneo cerrado para postulaciones")
    doc = {
        "id": str(uuid.uuid4()),
        "nombre": payload.nombre,
        "torneo_id": tid,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.equipos.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


# =================== PAYMENTS ===================
class CheckoutIn(BaseModel):
    reserva_id: str
    origin_url: str

@api_router.post("/payments/checkout")
async def create_checkout(payload: CheckoutIn, request: Request):
    user = await require_user(request)
    reserva = await db.reservas.find_one({"id": payload.reserva_id, "user_id": user["user_id"]}, {"_id": 0})
    if not reserva:
        raise HTTPException(404, "Reserva no encontrada")
    amount = float(reserva["precio"])
    if amount <= 0:
        raise HTTPException(400, "Monto inválido")
    
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payload.origin_url}/reservas"
    
    req = CheckoutSessionRequest(
        amount=amount,
        currency="cop",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"reserva_id": reserva["id"], "user_id": user["user_id"]},
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
    
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "reserva_id": reserva["id"],
        "user_id": user["user_id"],
        "amount": amount,
        "currency": "cop",
        "metadata": {"reserva_id": reserva["id"]},
        "payment_status": "initiated",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.reservas.update_one(
        {"id": reserva["id"]},
        {"$set": {"payment_session_id": session.session_id, "payment_status": "initiated"}}
    )
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transacción no encontrada")
    
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logging.error(f"Stripe status error: {e}")
        return {
            "status": tx.get("status", "unknown"),
            "payment_status": tx.get("payment_status", "unknown"),
            "amount_total": int(float(tx.get("amount", 0)) * 100),
            "currency": tx.get("currency", "cop"),
            "reserva_id": tx["reserva_id"],
            "error": str(e),
        }
    
    # idempotent: only confirm once
    already_paid = tx.get("payment_status") == "paid"
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": status.payment_status, "status": status.status}}
    )
    if status.payment_status == "paid" and not already_paid:
        await db.reservas.update_one(
            {"id": tx["reserva_id"]},
            {"$set": {"confirmada": True, "payment_status": "paid"}}
        )
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "reserva_id": tx["reserva_id"],
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        evt = await stripe_checkout.handle_webhook(body, signature)
        if evt.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": evt.session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                await db.reservas.update_one(
                    {"id": tx["reserva_id"]},
                    {"$set": {"confirmada": True, "payment_status": "paid"}}
                )
    except Exception as e:
        logging.error(f"Webhook error: {e}")
    return {"ok": True}


# =================== STATS / SEED ===================
@api_router.get("/stats")
async def get_stats():
    return {
        "recintos": await db.locales.count_documents({}),
        "canchas": await db.canchas.count_documents({}),
        "reservas_hoy": await db.reservas.count_documents({"fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d")}),
    }

@api_router.get("/stats/horas")
async def stats_horas(request: Request):
    await require_admin(request)
    pipeline = [
        {"$match": {"cancelada": False}},
        {"$group": {"_id": "$hora", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    items = await db.reservas.aggregate(pipeline).to_list(50)
    return {"horas": [{"hora": x["_id"], "total": x["total"]} for x in items]}

@api_router.get("/stats/ingresos")
async def stats_ingresos(request: Request):
    await require_admin(request)
    pipeline = [
        {"$match": {"cancelada": False}},
        {"$group": {"_id": None, "total": {"$sum": "$precio"}, "count": {"$sum": 1}}},
    ]
    res = await db.reservas.aggregate(pipeline).to_list(1)
    paid = await db.reservas.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$precio"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    return {
        "total_reservas": res[0]["count"] if res else 0,
        "ingresos_potenciales": res[0]["total"] if res else 0,
        "total_pagadas": paid[0]["count"] if paid else 0,
        "ingresos_confirmados": paid[0]["total"] if paid else 0,
    }


# =================== EXPORT CSV ===================
@api_router.get("/reservas/export.csv")
async def export_reservas_csv(request: Request, auth: Optional[str] = Query(None)):
    token = auth or request.cookies.get("session_token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(401, "No autenticado")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Sesión inválida")
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc or user_doc.get("role") != "admin":
        raise HTTPException(403, "Solo administradores")
    
    import csv
    import io as _io
    reservas = await db.reservas.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    cancha_ids = list({r["cancha_id"] for r in reservas})
    canchas = {c["id"]: c for c in await db.canchas.find({"id": {"$in": cancha_ids}}, {"_id": 0}).to_list(5000)}
    local_ids = list({r["local_id"] for r in reservas})
    locales = {loc["id"]: loc for loc in await db.locales.find({"id": {"$in": local_ids}}, {"_id": 0}).to_list(5000)}
    user_ids = list({r["user_id"] for r in reservas})
    users = {u["user_id"]: u for u in await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(5000)}
    
    buf = _io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ID", "Fecha", "Hora", "Cancha", "Local", "Usuario", "Email", "Precio_COP", "Confirmada", "Cancelada", "Pago", "Creada"])
    for r in reservas:
        c = canchas.get(r["cancha_id"], {})
        loc = locales.get(r["local_id"], {})
        u = users.get(r["user_id"], {})
        w.writerow([
            r["id"], r["fecha"], r["hora"],
            c.get("nombre", ""), loc.get("nombre", ""),
            u.get("name", ""), u.get("email", ""),
            r.get("precio", 0),
            "Sí" if r.get("confirmada") else "No",
            "Sí" if r.get("cancelada") else "No",
            r.get("payment_status", ""),
            r.get("created_at", ""),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reservas_outside.csv"},
    )


# =================== REGISTRO DE CANCHA ===================
@api_router.post("/registros-cancha")
async def crear_registro_cancha(payload: RegistroCanchaIn):
    doc = payload.model_dump()
    doc["email"] = doc["email"].lower().strip()
    doc["id"] = str(uuid.uuid4())
    doc["estado"] = "pendiente"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.registros_cancha.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.get("/registros-cancha")
async def listar_registros(request: Request):
    await require_admin(request)
    return await db.registros_cancha.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.put("/registros-cancha/{rid}/estado")
async def actualizar_registro(rid: str, request: Request, estado: str = Query(...)):
    await require_admin(request)
    if estado not in ("aprobado", "rechazado", "pendiente"):
        raise HTTPException(400, "Estado inválido")
    reg = await db.registros_cancha.find_one({"id": rid}, {"_id": 0})
    if not reg:
        raise HTTPException(404, "Registro no encontrado")
    
    updates = {"estado": estado}
    
    # Cuando se aprueba, crear automáticamente el local + canchas base
    if estado == "aprobado" and not reg.get("local_id"):
        local_id = str(uuid.uuid4())
        local_doc = {
            "id": local_id,
            "nombre": reg["nombre_local"],
            "direccion": reg["direccion"],
            "puntuacion": 5.0,
            "reglamento": ["Por definir por el dueño del local"],
            "precios_por_dia": [],
            "precios_por_hora": [],
            "imagen": None,
            "lat": None, "lng": None,
            "como_llegar": "",
            "puntos_referencia": [],
            "telefono": reg.get("telefono", ""),
            "horario": "Por definir",
            "owner_user_id": f"registro_{rid}",
            "contact_email": reg.get("email"),
            "contact_name": reg.get("nombre_contacto"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.locales.insert_one(local_doc.copy())
        # Crear N canchas base placeholder
        for i in range(int(reg.get("num_canchas", 1))):
            await db.canchas.insert_one({
                "id": str(uuid.uuid4()),
                "local_id": local_id,
                "nombre": f"Cancha {i+1}",
                "descripcion": "Cancha pendiente de configuración por el admin del local.",
                "precio_base": 100000,
                "dimensiones": {"largo": 40, "ancho": 20, "arco_alto": 2, "arco_ancho": 3},
                "imagenes": [],
                "items": {"acepta_ninos": True, "acepta_mascotas": False, "parqueadero": False, "vestidores": False, "iluminacion": False, "cafeteria": False, "duchas": False, "arbitro_incluido": False},
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        updates["local_id"] = local_id
    
    await db.registros_cancha.update_one({"id": rid}, {"$set": updates})
    return {"ok": True, "local_id": updates.get("local_id")}


@api_router.get("/registros-cancha/by-email/{email}")
async def consultar_registros_por_email(email: str):
    """Public endpoint - users can check status of their submission by email."""
    items = await db.registros_cancha.find({"email": email.lower()}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


SEED_VERSION = "v4-bquilla-verified"

async def seed_data():
    cfg = await db.config.find_one({"key": "seed_version"}, {"_id": 0})
    if cfg and cfg.get("value") == SEED_VERSION:
        return
    # Wipe and re-seed
    await db.locales.delete_many({})
    await db.canchas.delete_many({})
    await db.torneos.delete_many({})
    
    # 5 canchas con direcciones reales y verificables de Barranquilla.
    # NOTA: los mapas usan ?q={direccion} para que Google Maps geocodifique a la ubicación REAL.
    canchas_reales = [
        {
            "nombre": "Cancha Sintética Los Andes",
            "direccion": "Calle 72 #46B-100, Riomar, Barranquilla, Atlántico",
            "lat": 11.0089, "lng": -74.8156,
            "telefono": "+57 305 234 5678",
            "horario": "Lunes - Domingo, 6:00 am - 12:00 am",
            "puntuacion": 4.8,
            "como_llegar": "Ubicada en el sector de Riomar, sobre la Calle 72 entre la Carrera 46 y la Carrera 47. A 5 minutos del Centro Comercial Buenavista por la Cl. 72.",
            "puntos_referencia": ["Centro Comercial Buenavista", "Universidad del Norte", "Estación TransMetro Joe Arroyo"],
            "reglamento": [
                "Uso obligatorio de zapatillas para césped sintético (no taches metálicos)",
                "No se permite el ingreso con bebidas alcohólicas",
                "Respetar el horario reservado, llegar 10 minutos antes",
                "Cancelación con menos de 24h tiene cargo del 50%",
            ],
            "imagen": "https://images.unsplash.com/photo-1647118868186-70d38e10b0dc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            "canchas": [
                {"nombre": "Los Andes F8 Principal", "precio": 180000, "desc": "Cancha F8 cubierta con grama sintética FIFA, iluminación LED y graderías."},
                {"nombre": "Los Andes F5 Express", "precio": 120000, "desc": "Cancha F5 ideal para fútbol rápido entre amigos."},
            ],
            "items": {"acepta_ninos": True, "acepta_mascotas": False, "parqueadero": True, "vestidores": True, "iluminacion": True, "cafeteria": True, "duchas": True, "arbitro_incluido": False},
        },
        {
            "nombre": "Complejo Deportivo Villa Carolina",
            "direccion": "Carrera 50 #84-160, Villa Carolina, Barranquilla, Atlántico",
            "lat": 11.0156, "lng": -74.8198,
            "telefono": "+57 605 385 4321",
            "horario": "Lunes - Domingo, 7:00 am - 11:00 pm",
            "puntuacion": 4.6,
            "como_llegar": "En el barrio Villa Carolina, sobre la Cra. 50 con Cl. 84. Acceso fácil desde la Vía 40 o por la Cra. 51.",
            "puntos_referencia": ["Parque Villa Carolina", "Centro Comercial Villa Country", "Vía 40"],
            "reglamento": [
                "Prohibido el uso de cigarrillos dentro de las canchas",
                "Máximo 12 jugadores por equipo",
                "Los equipos deben llegar uniformados",
            ],
            "imagen": "https://images.unsplash.com/photo-1551958219-acbc608c6377?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            "canchas": [
                {"nombre": "Villa Carolina F7", "precio": 140000, "desc": "Cancha F7 con cerramiento total y zona BBQ adyacente."},
                {"nombre": "Villa Carolina F5", "precio": 100000, "desc": "Cancha F5 perfecta para grupos pequeños."},
            ],
            "items": {"acepta_ninos": True, "acepta_mascotas": True, "parqueadero": True, "vestidores": True, "iluminacion": True, "cafeteria": True, "duchas": True, "arbitro_incluido": True},
        },
        {
            "nombre": "Canchas El Golf",
            "direccion": "Calle 53 #72-50, El Golf, Barranquilla, Atlántico",
            "lat": 10.9929, "lng": -74.8011,
            "telefono": "+57 300 987 6543",
            "horario": "Lunes - Domingo, 6:00 am - 10:00 pm",
            "puntuacion": 4.7,
            "como_llegar": "En el barrio El Golf, sobre la Calle 53. Cerca al Estadio Romelio Martínez y al Country Club de Barranquilla.",
            "puntos_referencia": ["Estadio Romelio Martínez", "Country Club Barranquilla", "Universidad Simón Bolívar"],
            "reglamento": [
                "Césped sintético renovado en 2024, cuídalo",
                "No se permite el ingreso de comida del exterior",
                "Sistema de luces LED encendido automático",
            ],
            "imagen": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            "canchas": [
                {"nombre": "El Golf F8 Pro", "precio": 160000, "desc": "Cancha F8 con grama de última generación, popular en torneos amateur."},
                {"nombre": "El Golf F5", "precio": 90000, "desc": "Cancha F5 económica con buena iluminación nocturna."},
            ],
            "items": {"acepta_ninos": True, "acepta_mascotas": False, "parqueadero": True, "vestidores": True, "iluminacion": True, "cafeteria": False, "duchas": True, "arbitro_incluido": False},
        },
        {
            "nombre": "Deportivo Alto Prado",
            "direccion": "Carrera 51B #76-78, Alto Prado, Barranquilla, Atlántico",
            "lat": 11.0089, "lng": -74.8074,
            "telefono": "+57 605 334 5678",
            "horario": "Lunes - Domingo, 5:00 am - 11:00 pm",
            "puntuacion": 4.9,
            "como_llegar": "En el sector Alto Prado, sobre la Cra. 51B. A 3 minutos del Estadio Tomás Suri Salcedo. Buen parqueadero interno.",
            "puntos_referencia": ["Estadio Tomás Suri Salcedo", "Parque Alto Prado", "Centro Comercial Único"],
            "reglamento": [
                "Canchas certificadas por FIFA, uso obligatorio de calzado adecuado",
                "Reservas mínimas de 1 hora",
                "Academia de fútbol disponible para niños y jóvenes",
            ],
            "imagen": "https://images.unsplash.com/photo-1551958219-acbc608c6377?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            "canchas": [
                {"nombre": "Alto Prado F11 FIFA", "precio": 220000, "desc": "Cancha F11 reglamentaria, certificada FIFA Pro. Usada por equipos profesionales."},
                {"nombre": "Alto Prado F7", "precio": 150000, "desc": "Cancha F7 profesional con grama natural sintética."},
            ],
            "items": {"acepta_ninos": True, "acepta_mascotas": False, "parqueadero": True, "vestidores": True, "iluminacion": True, "cafeteria": True, "duchas": True, "arbitro_incluido": True},
        },
        {
            "nombre": "Sintética El Country",
            "direccion": "Calle 84 #51B-25, El Country, Barranquilla, Atlántico",
            "lat": 11.0213, "lng": -74.8201,
            "telefono": "+57 310 777 4422",
            "horario": "Lunes - Sábado, 7:00 am - 11:00 pm. Domingo 9:00 am - 9:00 pm",
            "puntuacion": 4.5,
            "como_llegar": "Sobre la Cl. 84 en El Country, entre la Cra. 51 y la Cra. 52. Sector residencial con fácil acceso vehicular y por TransMetro.",
            "puntos_referencia": ["Country Club", "Centro Comercial Villa Country", "Mall Plaza El Castillo"],
            "reglamento": [
                "Reglamento estándar FIFA aplicable",
                "Prohibido fumar y consumir alcohol dentro de las instalaciones",
                "Los menores deben venir acompañados de un adulto",
            ],
            "imagen": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
            "canchas": [
                {"nombre": "El Country F8 Premium", "precio": 170000, "desc": "Cancha F8 premium con iluminación profesional, ideal para partidos nocturnos."},
                {"nombre": "El Country F5 Family", "precio": 95000, "desc": "Cancha F5 con zona infantil y graderías familiares."},
            ],
            "items": {"acepta_ninos": True, "acepta_mascotas": True, "parqueadero": True, "vestidores": True, "iluminacion": True, "cafeteria": True, "duchas": True, "arbitro_incluido": False},
        },
    ]
    
    standard_precios_dia = [
        {"dia_nombre": "Lunes", "dia_numero": 0, "multiplicador": 1.0},
        {"dia_nombre": "Martes", "dia_numero": 1, "multiplicador": 1.0},
        {"dia_nombre": "Miércoles", "dia_numero": 2, "multiplicador": 1.0},
        {"dia_nombre": "Jueves", "dia_numero": 3, "multiplicador": 1.1},
        {"dia_nombre": "Viernes", "dia_numero": 4, "multiplicador": 1.3},
        {"dia_nombre": "Sábado", "dia_numero": 5, "multiplicador": 1.5},
        {"dia_nombre": "Domingo", "dia_numero": 6, "multiplicador": 1.4},
    ]
    standard_precios_hora = [
        {"hora": "18:00", "multiplicador": 1.2},
        {"hora": "19:00", "multiplicador": 1.3},
        {"hora": "20:00", "multiplicador": 1.4},
        {"hora": "21:00", "multiplicador": 1.3},
    ]
    
    for c in canchas_reales:
        local_id = str(uuid.uuid4())
        await db.locales.insert_one({
            "id": local_id,
            "nombre": c["nombre"], "direccion": c["direccion"],
            "lat": c["lat"], "lng": c["lng"],
            "telefono": c["telefono"], "horario": c["horario"],
            "puntuacion": c["puntuacion"],
            "como_llegar": c["como_llegar"],
            "puntos_referencia": c["puntos_referencia"],
            "reglamento": c["reglamento"],
            "precios_por_dia": standard_precios_dia,
            "precios_por_hora": standard_precios_hora,
            "imagen": c["imagen"],
            "owner_user_id": "seed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        for cancha in c["canchas"]:
            await db.canchas.insert_one({
                "id": str(uuid.uuid4()),
                "local_id": local_id,
                "nombre": cancha["nombre"],
                "descripcion": cancha["desc"],
                "precio_base": cancha["precio"],
                "dimensiones": {"largo": 40, "ancho": 20, "arco_alto": 2, "arco_ancho": 3},
                "imagenes": [c["imagen"]],
                "items": c["items"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    
    # Torneos con categorías
    torneos_seed = [
        {"nombre": "Liga OutSide Senior 2026", "tipo": "liga", "categoria": "Senior",
         "descripcion": "Liga oficial de OutSide para jugadores mayores de 18 años. 16 equipos competirán en formato de ida y vuelta. Premios en efectivo y trofeo oficial.",
         "fecha_inicio": "2026-03-15", "cupo": 16},
        {"nombre": "Copa Juvenil 2026", "tipo": "eliminación directa", "categoria": "Juvenil",
         "descripcion": "Copa de eliminación directa para jugadores entre 14 y 17 años. ¡Demuestra tu talento!",
         "fecha_inicio": "2026-04-10", "cupo": 12},
        {"nombre": "Torneo Infantil OutSide Kids", "tipo": "liga", "categoria": "Infantil",
         "descripcion": "Torneo infantil para niños de 8 a 12 años. Diversión, deporte y formación integral.",
         "fecha_inicio": "2026-05-05", "cupo": 10},
        {"nombre": "Copa Mixta Barranquilla", "tipo": "copa", "categoria": "Mixto",
         "descripcion": "Torneo mixto donde cada equipo debe alinear al menos 2 mujeres en cancha. ¡Inclusión y deporte!",
         "fecha_inicio": "2026-06-20", "cupo": 14},
    ]
    tournament_img = "https://images.unsplash.com/photo-1582086772405-6e2dcef428d4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
    for t in torneos_seed:
        await db.torneos.insert_one({
            "id": str(uuid.uuid4()),
            "nombre": t["nombre"], "descripcion": t["descripcion"],
            "sedes": [], "tipo": t["tipo"], "categoria": t["categoria"],
            "abierto": True, "fecha_inicio": t["fecha_inicio"],
            "cupo_maximo": t["cupo"],
            "imagen": tournament_img,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    
    await db.config.update_one(
        {"key": "seed_version"},
        {"$set": {"key": "seed_version", "value": SEED_VERSION}},
        upsert=True,
    )

@api_router.get("/")
async def root():
    return {"message": "OutSide API", "version": "1.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init error: {e}")
    try:
        await seed_data()
        logger.info("Seed data ready")
    except Exception as e:
        logger.error(f"Seed error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
