"""
OutSide iteration_2 backend tests:
- 5 real Barranquilla locales + 10 canchas seeded (SEED_VERSION v3)
- lat/lng, como_llegar, puntos_referencia, telefono, horario on locales
- items boolean flags on canchas
- COP currency in payments (cop, integer thousands)
- /api/registros-cancha public POST + admin GET/PUT
- /api/stats/horas, /api/stats/ingresos (admin)
- /api/reservas/export.csv (admin, supports ?auth=, Bearer, cookie)
- /api/torneos categoria field (Senior/Juvenil/Infantil/Mixto)
- RBAC: non-admin denied on all admin-only endpoints
"""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@outside.com"
USER_EMAIL = f"TEST_user2_{uuid.uuid4().hex[:6]}@outside.com"

EXPECTED_LOCALES = {
    "La 8 FC Cancha Sintética",
    "Goal FC Barranquilla",
    "Mundial Soccer 5",
    "Estadio Norte Sintético",
    "Sintética del Norte FC",
}
EXPECTED_CATEGORIAS = {"Senior", "Juvenil", "Infantil", "Mixto"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/dev-seed",
                      json={"email": ADMIN_EMAIL, "name": "Admin OutSide"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    return client[os.environ.get("DB_NAME", "test_database")]


@pytest.fixture(scope="session")
def user_token(mongo):
    uid = f"user_TEST_{uuid.uuid4().hex[:8]}"
    token = f"TEST_tok_{uuid.uuid4().hex}"
    mongo.users.insert_one({
        "user_id": uid, "email": USER_EMAIL, "name": "TEST Regular",
        "picture": None, "apellido": "", "edad": None, "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": uid, "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield token
    mongo.users.delete_many({"email": {"$regex": "^TEST_"}})
    mongo.user_sessions.delete_many({"session_token": {"$regex": "^TEST_"}})
    mongo.registros_cancha.delete_many({"email": {"$regex": "^TEST_"}})
    mongo.reservas.delete_many({"user_id": uid})


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


# ---------------- Seed verification ----------------
class TestSeed:
    def test_locales_count_and_names(self):
        r = requests.get(f"{API}/locales", timeout=30)
        assert r.status_code == 200
        locales = r.json()
        names = {loc["nombre"] for loc in locales}
        # Must contain all 5 real Barranquilla locales
        assert EXPECTED_LOCALES.issubset(names), f"missing: {EXPECTED_LOCALES - names}"
        assert len(locales) == 5, f"expected exactly 5 seeded locales, got {len(locales)}: {names}"

    def test_canchas_count_10(self):
        r = requests.get(f"{API}/canchas", timeout=30)
        assert r.status_code == 200
        canchas = r.json()
        assert len(canchas) == 10, f"expected 10 canchas (2 per local x 5), got {len(canchas)}"

    def test_locales_have_geo_and_metadata(self):
        locales = requests.get(f"{API}/locales", timeout=30).json()
        for loc in locales:
            if loc["nombre"] not in EXPECTED_LOCALES:
                continue
            assert "lat" in loc and isinstance(loc["lat"], (int, float)), f"{loc['nombre']} missing lat"
            assert "lng" in loc and isinstance(loc["lng"], (int, float)), f"{loc['nombre']} missing lng"
            # Barranquilla bounding box
            assert 10.95 <= loc["lat"] <= 11.05, f"{loc['nombre']} lat {loc['lat']} not in Barranquilla range"
            assert -74.85 <= loc["lng"] <= -74.78, f"{loc['nombre']} lng {loc['lng']} not in Barranquilla range"
            assert loc.get("como_llegar"), f"{loc['nombre']} missing como_llegar"
            assert isinstance(loc.get("puntos_referencia"), list) and len(loc["puntos_referencia"]) > 0
            assert loc.get("telefono"), f"{loc['nombre']} missing telefono"
            assert loc.get("horario"), f"{loc['nombre']} missing horario"

    def test_canchas_have_items_flags(self):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        required_keys = {"acepta_ninos", "acepta_mascotas", "parqueadero",
                         "vestidores", "iluminacion", "cafeteria", "duchas", "arbitro_incluido"}
        for c in canchas:
            assert "items" in c and isinstance(c["items"], dict), f"cancha {c.get('nombre')} missing items"
            missing = required_keys - set(c["items"].keys())
            assert not missing, f"cancha {c['nombre']} missing items keys: {missing}"
            for k in required_keys:
                assert isinstance(c["items"][k], bool), f"items.{k} not bool in {c['nombre']}"

    def test_cancha_precio_in_cop_integer_thousands(self):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        for c in canchas:
            p = c["precio_base"]
            assert p >= 50000, f"cancha {c['nombre']} precio {p} looks like USD not COP"


# ---------------- Torneos categoria ----------------
class TestTorneosCategoria:
    def test_seeded_torneos_have_categoria(self):
        r = requests.get(f"{API}/torneos", timeout=30)
        assert r.status_code == 200
        torneos = r.json()
        cats = {t.get("categoria") for t in torneos}
        assert EXPECTED_CATEGORIAS.issubset(cats), f"missing categorias: {EXPECTED_CATEGORIAS - cats}"

    def test_create_torneo_with_categoria(self, admin_headers):
        payload = {
            "nombre": f"TEST_TorneoCat_{uuid.uuid4().hex[:6]}",
            "descripcion": "test", "tipo": "liga",
            "categoria": "Veteranos", "cupo_maximo": 8, "abierto": True,
        }
        r = requests.post(f"{API}/torneos", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["categoria"] == "Veteranos"
        assert body["cupo_maximo"] == 8
        tid = body["id"]
        # verify persistence via GET
        g = requests.get(f"{API}/torneos/{tid}", timeout=30)
        assert g.status_code == 200 and g.json()["categoria"] == "Veteranos"
        requests.delete(f"{API}/torneos/{tid}", headers=admin_headers, timeout=30)


# ---------------- Registro de cancha ----------------
class TestRegistrosCancha:
    def test_create_public_no_auth(self):
        payload = {
            "nombre_local": "TEST_RegLocal_X",
            "direccion": "Calle Test 1",
            "telefono": "+57 300 111 2222",
            "email": f"TEST_reg_{uuid.uuid4().hex[:6]}@example.com",
            "nombre_contacto": "TEST Contacto",
            "num_canchas": 2,
            "mensaje": "Quiero afiliar mi cancha",
        }
        # NO auth headers - this must be public
        r = requests.post(f"{API}/registros-cancha", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body and body["estado"] == "pendiente"
        assert body["nombre_local"] == payload["nombre_local"]
        return body["id"], payload["email"]

    def test_admin_can_list(self, admin_headers):
        # seed one
        rid_email = self.test_create_public_no_auth()
        r = requests.get(f"{API}/registros-cancha", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        # the one we just created should be present
        assert any(it["id"] == rid_email[0] for it in items)

    def test_admin_can_update_estado(self, admin_headers):
        rid, _ = self.test_create_public_no_auth()
        r = requests.put(f"{API}/registros-cancha/{rid}/estado",
                         params={"estado": "aprobado"}, headers=admin_headers, timeout=30)
        assert r.status_code == 200
        # verify
        items = requests.get(f"{API}/registros-cancha", headers=admin_headers, timeout=30).json()
        match = next((it for it in items if it["id"] == rid), None)
        assert match is not None and match["estado"] == "aprobado"

    def test_admin_invalid_estado_rejected(self, admin_headers):
        rid, _ = self.test_create_public_no_auth()
        r = requests.put(f"{API}/registros-cancha/{rid}/estado",
                         params={"estado": "garbage"}, headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_non_admin_cannot_list(self, user_headers):
        r = requests.get(f"{API}/registros-cancha", headers=user_headers, timeout=30)
        assert r.status_code == 403

    def test_non_admin_cannot_update_estado(self, user_headers):
        rid, _ = self.test_create_public_no_auth()
        r = requests.put(f"{API}/registros-cancha/{rid}/estado",
                         params={"estado": "rechazado"}, headers=user_headers, timeout=30)
        assert r.status_code == 403


# ---------------- Stats ----------------
class TestStatsAdmin:
    def test_stats_horas_admin(self, admin_headers):
        r = requests.get(f"{API}/stats/horas", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "horas" in body and isinstance(body["horas"], list)
        # sorted desc by total
        totals = [h["total"] for h in body["horas"]]
        assert totals == sorted(totals, reverse=True)

    def test_stats_horas_non_admin_forbidden(self, user_headers):
        r = requests.get(f"{API}/stats/horas", headers=user_headers, timeout=30)
        assert r.status_code == 403

    def test_stats_horas_unauthenticated(self):
        r = requests.get(f"{API}/stats/horas", timeout=30)
        assert r.status_code == 401

    def test_stats_ingresos_admin(self, admin_headers):
        r = requests.get(f"{API}/stats/ingresos", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        for k in ("total_reservas", "ingresos_potenciales", "total_pagadas", "ingresos_confirmados"):
            assert k in body, f"missing key {k}"
            assert isinstance(body[k], (int, float)), f"{k} not numeric"

    def test_stats_ingresos_non_admin_forbidden(self, user_headers):
        r = requests.get(f"{API}/stats/ingresos", headers=user_headers, timeout=30)
        assert r.status_code == 403


# ---------------- CSV Export ----------------
class TestCsvExport:
    def test_export_bearer_auth(self, admin_headers):
        r = requests.get(f"{API}/reservas/export.csv", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "").lower()
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        text = r.text
        # header row contains key columns
        first_line = text.splitlines()[0] if text else ""
        for col in ("ID", "Fecha", "Hora", "Precio_COP", "Email"):
            assert col in first_line, f"missing column {col} in CSV header"

    def test_export_query_auth(self, admin_token):
        # browser download flow with ?auth=
        r = requests.get(f"{API}/reservas/export.csv", params={"auth": admin_token}, timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "").lower()

    def test_export_cookie_auth(self, admin_token):
        cookies = {"session_token": admin_token}
        r = requests.get(f"{API}/reservas/export.csv", cookies=cookies, timeout=30)
        assert r.status_code == 200

    def test_export_non_admin_forbidden(self, user_headers):
        r = requests.get(f"{API}/reservas/export.csv", headers=user_headers, timeout=30)
        assert r.status_code == 403

    def test_export_unauthenticated(self):
        r = requests.get(f"{API}/reservas/export.csv", timeout=30)
        assert r.status_code == 401


# ---------------- Reserva precio in COP ----------------
class TestReservaCop:
    def test_reserva_precio_is_cop_integer_thousands(self, user_headers):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        payload = {
            "local_id": c["local_id"], "cancha_id": c["id"],
            "fecha": "2032-07-15", "hora": f"{(uuid.uuid4().int % 12) + 8:02d}:00",
        }
        r = requests.post(f"{API}/reservas", json=payload, headers=user_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["precio"] >= 50000, f"precio {body['precio']} too low for COP"


# ---------------- Stripe currency COP ----------------
class TestStripeCop:
    def test_checkout_uses_cop_currency(self, user_headers):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        rp = {
            "local_id": c["local_id"], "cancha_id": c["id"],
            "fecha": "2033-09-15", "hora": "20:00",
        }
        rr = requests.post(f"{API}/reservas", json=rp, headers=user_headers, timeout=30)
        assert rr.status_code == 200, rr.text
        rid = rr.json()["id"]

        r = requests.post(f"{API}/payments/checkout",
                          json={"reserva_id": rid, "origin_url": "https://example.com"},
                          headers=user_headers, timeout=60)
        assert r.status_code == 200, r.text
        sb = r.json()
        # verify currency persisted as cop in payment_transactions
        client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = client[os.environ.get("DB_NAME", "test_database")]
        tx = db.payment_transactions.find_one({"session_id": sb["session_id"]}, {"_id": 0})
        assert tx is not None
        assert tx.get("currency") == "cop", f"expected cop, got {tx.get('currency')}"


# ---------------- Discount integration sanity (still correct) ----------------
class TestDiscountStillWorks:
    def test_pricing_with_descuento(self, admin_headers):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        fecha, hora = "2027-03-15", "10:00"
        base = requests.post(f"{API}/reservas/calcular-precio",
                             json={"cancha_id": c["id"], "fecha": fecha, "hora": hora}, timeout=30).json()
        base_price = base["precio"]
        payload = {
            "local_id": c["local_id"],
            "nombre": f"TEST_desc2_{uuid.uuid4().hex[:6]}",
            "porcentaje": 50.0, "vigente": True,
            "condicion": {"tipo": "fecha-hora-exacta", "fecha": fecha, "hora": hora},
        }
        r = requests.post(f"{API}/descuentos", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200
        did = r.json()["id"]
        try:
            r2 = requests.post(f"{API}/reservas/calcular-precio",
                               json={"cancha_id": c["id"], "fecha": fecha, "hora": hora}, timeout=30).json()
            # precio = base * (1 - 50/100) = base * 0.5
            assert abs(r2["precio"] - base_price * 0.5) < 1, \
                f"expected {base_price*0.5}, got {r2['precio']}"
        finally:
            requests.delete(f"{API}/descuentos/{did}", headers=admin_headers, timeout=30)
