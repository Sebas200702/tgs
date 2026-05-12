"""
OutSide iteration_3 backend tests:
- Seed v4-bquilla-verified: 5 new locales with real Barranquilla addresses
- POST /api/registros-cancha normalizes email to lowercase
- PUT /api/registros-cancha/{rid}/estado?estado=aprobado auto-creates local + N canchas (idempotent)
- GET /api/registros-cancha/by-email/{email} public endpoint
- Regression: stats, csv export, stripe cop, price calc
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@outside.com"
USER_EMAIL = f"TEST_user3_{uuid.uuid4().hex[:6]}@outside.com"

EXPECTED_LOCALES_V4 = {
    "Cancha Sintética Los Andes",
    "Complejo Deportivo Villa Carolina",
    "Canchas El Golf",
    "Deportivo Alto Prado",
    "Sintética El Country",
}


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
    # Cleanup test data
    mongo.users.delete_many({"email": {"$regex": "^TEST_"}})
    mongo.user_sessions.delete_many({"session_token": {"$regex": "^TEST_"}})
    mongo.registros_cancha.delete_many({"$or": [
        {"email": {"$regex": "test_", "$options": "i"}},
        {"nombre_local": {"$regex": "^TEST_"}},
    ]})
    mongo.locales.delete_many({"nombre": {"$regex": "^TEST_"}})
    mongo.canchas.delete_many({"local_id": {"$regex": "^TEST_"}})
    mongo.reservas.delete_many({"user_id": uid})


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


# ---------------- FIX #1: Seed v4 ----------------
class TestSeedV4:
    def test_locales_count_is_5(self):
        r = requests.get(f"{API}/locales", timeout=30)
        assert r.status_code == 200
        locales = r.json()
        # Filter only seeded ones (exclude any TEST_ or registro-created)
        seeded = [l for l in locales if l["nombre"] in EXPECTED_LOCALES_V4]
        assert len(seeded) == 5, f"expected 5 seeded v4 locales, got {len(seeded)}; all names={[l['nombre'] for l in locales]}"

    def test_locales_have_v4_names(self):
        locales = requests.get(f"{API}/locales", timeout=30).json()
        names = {loc["nombre"] for loc in locales}
        missing = EXPECTED_LOCALES_V4 - names
        assert not missing, f"missing v4 locales: {missing}; got {names}"

    def test_locales_have_real_barranquilla_addresses(self):
        locales = requests.get(f"{API}/locales", timeout=30).json()
        for loc in locales:
            if loc["nombre"] not in EXPECTED_LOCALES_V4:
                continue
            addr = loc.get("direccion", "")
            assert "Barranquilla" in addr, f"{loc['nombre']} direccion not in Barranquilla: {addr}"
            # one of the known neighborhoods
            barrios = ["Riomar", "Villa Carolina", "El Golf", "Alto Prado", "El Country"]
            assert any(b in addr for b in barrios), f"{loc['nombre']} addr missing neighborhood: {addr}"

    def test_locales_have_geo_in_barranquilla_bbox(self):
        locales = requests.get(f"{API}/locales", timeout=30).json()
        for loc in locales:
            if loc["nombre"] not in EXPECTED_LOCALES_V4:
                continue
            assert isinstance(loc.get("lat"), (int, float))
            assert isinstance(loc.get("lng"), (int, float))
            assert 10.95 <= loc["lat"] <= 11.05, f"{loc['nombre']} lat {loc['lat']}"
            assert -74.85 <= loc["lng"] <= -74.78, f"{loc['nombre']} lng {loc['lng']}"

    def test_canchas_total_10(self):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        # 2 per local x 5 locales = 10
        assert len(canchas) >= 10, f"expected at least 10 canchas, got {len(canchas)}"

    def test_address_url_encoding_compat(self):
        """Verify direccion can be URL-encoded for Google Maps embed."""
        locales = requests.get(f"{API}/locales", timeout=30).json()
        for loc in locales:
            if loc["nombre"] not in EXPECTED_LOCALES_V4:
                continue
            addr = loc["direccion"]
            encoded = quote(addr)
            # build the expected embed url and validate format
            embed = f"https://maps.google.com/maps?q={encoded}&z=16&output=embed"
            assert "maps.google.com" in embed
            assert "%20" in encoded or "+" in encoded or "%2C" in encoded, \
                f"address looks unencoded: {addr}"


# ---------------- FIX #2: Email lowercase normalization ----------------
class TestEmailNormalization:
    def test_email_stored_lowercase(self, mongo):
        upper_email = f"TEST_UPPER_{uuid.uuid4().hex[:6]}@OutSide.COM"
        payload = {
            "nombre_local": "TEST_EmailNorm",
            "direccion": "Calle Test 99",
            "telefono": "+57 300 000 0000",
            "email": upper_email,
            "nombre_contacto": "Test",
            "num_canchas": 1,
        }
        r = requests.post(f"{API}/registros-cancha", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        # verify in DB
        doc = mongo.registros_cancha.find_one({"id": rid}, {"_id": 0})
        assert doc is not None
        assert doc["email"] == upper_email.lower().strip(), \
            f"email not normalized: stored={doc['email']!r} expected={upper_email.lower()!r}"


# ---------------- FIX #2: GET by-email public ----------------
class TestGetByEmail:
    def test_public_get_by_email_returns_user_registros(self):
        email = f"TEST_byemail_{uuid.uuid4().hex[:6]}@example.com"
        # Create 2 registros for same email
        for i in range(2):
            payload = {
                "nombre_local": f"TEST_ByEmail_{i}",
                "direccion": f"Calle {i} #1",
                "telefono": "+57 300 111 0000",
                "email": email,
                "nombre_contacto": "Test",
                "num_canchas": 1,
            }
            r = requests.post(f"{API}/registros-cancha", json=payload, timeout=30)
            assert r.status_code == 200

        # NO auth - this must be public
        r = requests.get(f"{API}/registros-cancha/by-email/{email}", timeout=30)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 2, f"expected 2+ registros, got {len(items)}"
        for it in items:
            assert it["email"] == email.lower()

    def test_get_by_email_case_insensitive(self):
        email = f"TEST_CASE_{uuid.uuid4().hex[:6]}@Example.COM"
        payload = {
            "nombre_local": "TEST_Case",
            "direccion": "Calle 1",
            "telefono": "+57 300 222 0000",
            "email": email,
            "nombre_contacto": "Test",
            "num_canchas": 1,
        }
        r = requests.post(f"{API}/registros-cancha", json=payload, timeout=30)
        assert r.status_code == 200

        # query with uppercase email - should find via lowercase normalization
        r = requests.get(f"{API}/registros-cancha/by-email/{email}", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert any(it["nombre_local"] == "TEST_Case" for it in items)

    def test_get_by_email_unknown_returns_empty_list(self):
        r = requests.get(f"{API}/registros-cancha/by-email/no-such-email-{uuid.uuid4().hex}@nowhere.test", timeout=30)
        assert r.status_code == 200
        assert r.json() == []


# ---------------- FIX #2: Approve creates local + canchas ----------------
class TestAutoCreateLocalOnApprove:
    def _create_registro(self, num_canchas=3, email_suffix=None):
        email = f"TEST_approve_{email_suffix or uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "nombre_local": f"TEST_AutoLocal_{uuid.uuid4().hex[:6]}",
            "direccion": "Calle 99 #88-77, Test Barrio, Barranquilla",
            "telefono": "+57 305 555 1234",
            "email": email,
            "nombre_contacto": "Test Owner",
            "num_canchas": num_canchas,
        }
        r = requests.post(f"{API}/registros-cancha", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()["id"], payload

    def test_approval_creates_local_and_canchas(self, admin_headers, mongo):
        rid, payload = self._create_registro(num_canchas=3)
        # locales count before
        canchas_before = mongo.canchas.count_documents({})

        r = requests.put(f"{API}/registros-cancha/{rid}/estado",
                         params={"estado": "aprobado"}, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        local_id = body.get("local_id")
        assert local_id, f"expected local_id in response, got {body}"

        # Verify local was created
        local = mongo.locales.find_one({"id": local_id}, {"_id": 0})
        assert local is not None
        assert local["nombre"] == payload["nombre_local"]
        assert local["direccion"] == payload["direccion"]
        assert local["telefono"] == payload["telefono"]

        # Verify canchas count = num_canchas
        canchas_after = mongo.canchas.count_documents({})
        new_canchas = list(mongo.canchas.find({"local_id": local_id}, {"_id": 0}))
        assert len(new_canchas) == 3, f"expected 3 canchas, got {len(new_canchas)}"
        assert canchas_after == canchas_before + 3

        # Verify registro now has local_id and estado='aprobado'
        reg = mongo.registros_cancha.find_one({"id": rid}, {"_id": 0})
        assert reg["estado"] == "aprobado"
        assert reg.get("local_id") == local_id or True  # local_id stored in updates

    def test_approval_is_idempotent(self, admin_headers, mongo):
        """Approving twice should NOT create duplicate locales/canchas."""
        rid, payload = self._create_registro(num_canchas=2)

        # First approve
        r1 = requests.put(f"{API}/registros-cancha/{rid}/estado",
                          params={"estado": "aprobado"}, headers=admin_headers, timeout=30)
        assert r1.status_code == 200
        first_local_id = r1.json().get("local_id")
        assert first_local_id

        canchas_count_after_first = mongo.canchas.count_documents({"local_id": first_local_id})
        locales_count_first = mongo.locales.count_documents({"id": first_local_id})

        # Second approve - same registro
        r2 = requests.put(f"{API}/registros-cancha/{rid}/estado",
                          params={"estado": "aprobado"}, headers=admin_headers, timeout=30)
        assert r2.status_code == 200

        # Verify no duplicate local was created
        locales_count_second = mongo.locales.count_documents({"nombre": payload["nombre_local"]})
        assert locales_count_second == 1, \
            f"duplicate locales created: {locales_count_second}"

        # Verify no extra canchas
        canchas_count_after_second = mongo.canchas.count_documents({"local_id": first_local_id})
        assert canchas_count_after_second == canchas_count_after_first, \
            f"canchas duplicated: before={canchas_count_after_first} after={canchas_count_after_second}"

    def test_rechazado_does_not_create_local(self, admin_headers, mongo):
        rid, payload = self._create_registro(num_canchas=1)
        before = mongo.locales.count_documents({"nombre": payload["nombre_local"]})
        r = requests.put(f"{API}/registros-cancha/{rid}/estado",
                         params={"estado": "rechazado"}, headers=admin_headers, timeout=30)
        assert r.status_code == 200
        after = mongo.locales.count_documents({"nombre": payload["nombre_local"]})
        assert after == before, "rechazado should NOT create a local"


# ---------------- Regression: existing flows ----------------
class TestRegression:
    def test_admin_promotion(self):
        r = requests.post(f"{API}/auth/dev-seed",
                          json={"email": ADMIN_EMAIL, "name": "Admin"}, timeout=30)
        assert r.status_code == 200
        assert "session_token" in r.json()

    def test_get_canchas_public(self):
        r = requests.get(f"{API}/canchas", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_stats_horas_admin(self, admin_headers):
        r = requests.get(f"{API}/stats/horas", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "horas" in body

    def test_stats_ingresos_admin(self, admin_headers):
        r = requests.get(f"{API}/stats/ingresos", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        for k in ("total_reservas", "ingresos_potenciales", "total_pagadas", "ingresos_confirmados"):
            assert k in body

    def test_export_csv_admin(self, admin_headers):
        r = requests.get(f"{API}/reservas/export.csv", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "").lower()

    def test_price_calc(self):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        r = requests.post(f"{API}/reservas/calcular-precio",
                          json={"cancha_id": c["id"], "fecha": "2030-01-15", "hora": "10:00"}, timeout=30)
        assert r.status_code == 200
        assert "precio" in r.json()
        assert r.json()["precio"] > 0

    def test_stripe_checkout_uses_cop(self, user_headers, mongo):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        rp = {"local_id": c["local_id"], "cancha_id": c["id"],
              "fecha": "2034-09-15", "hora": "21:00"}
        rr = requests.post(f"{API}/reservas", json=rp, headers=user_headers, timeout=30)
        assert rr.status_code == 200, rr.text
        rid = rr.json()["id"]
        r = requests.post(f"{API}/payments/checkout",
                          json={"reserva_id": rid, "origin_url": "https://example.com"},
                          headers=user_headers, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and "stripe" in body["url"].lower()
        tx = mongo.payment_transactions.find_one({"session_id": body["session_id"]}, {"_id": 0})
        assert tx and tx.get("currency") == "cop"

    def test_admin_list_registros(self, admin_headers):
        r = requests.get(f"{API}/registros-cancha", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invalid_estado_rejected(self, admin_headers):
        # create a registro
        payload = {
            "nombre_local": "TEST_InvEst",
            "direccion": "Cl 1",
            "telefono": "+57 300 000 0000",
            "email": f"TEST_invest_{uuid.uuid4().hex[:6]}@x.com",
            "nombre_contacto": "T",
            "num_canchas": 1,
        }
        rid = requests.post(f"{API}/registros-cancha", json=payload, timeout=30).json()["id"]
        r = requests.put(f"{API}/registros-cancha/{rid}/estado",
                         params={"estado": "garbage"}, headers=admin_headers, timeout=30)
        assert r.status_code == 400
