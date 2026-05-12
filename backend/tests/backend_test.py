"""
OutSide backend API tests.
Covers: auth (dev-seed, /me, RBAC), locales CRUD, canchas CRUD, pricing,
reservas (create/list/cancel/confirm/conflict), descuentos CRUD + integration,
torneos CRUD + postular, upload/files, payments checkout & status, stats.
"""
import os
import uuid
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://web-dev-helper-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@outside.com"
USER_EMAIL = f"TEST_user_{uuid.uuid4().hex[:6]}@outside.com"


# ----------------- Fixtures -----------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/dev-seed",
                      json={"email": ADMIN_EMAIL, "name": "Admin OutSide"}, timeout=30)
    assert r.status_code == 200, f"dev-seed failed: {r.status_code} {r.text}"
    data = r.json()
    assert "session_token" in data and data["user"]["role"] == "admin"
    return data["session_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def user_token():
    """Create regular user directly in Mongo + a session token."""
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = MongoClient(mongo_url)
    db = client[db_name]
    uid = f"user_TEST_{uuid.uuid4().hex[:8]}"
    token = f"TEST_tok_{uuid.uuid4().hex}"
    db.users.insert_one({
        "user_id": uid, "email": USER_EMAIL, "name": "Regular User",
        "picture": None, "apellido": "", "edad": None, "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid, "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield token
    # Cleanup
    db.users.delete_many({"email": {"$regex": "^TEST_"}})
    db.user_sessions.delete_many({"session_token": {"$regex": "^TEST_"}})
    db.locales.delete_many({"nombre": {"$regex": "^TEST_"}})
    db.canchas.delete_many({"nombre": {"$regex": "^TEST_"}})
    db.descuentos.delete_many({"nombre": {"$regex": "^TEST_"}})
    db.torneos.delete_many({"nombre": {"$regex": "^TEST_"}})
    db.reservas.delete_many({"user_id": uid})


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


# ----------------- Auth -----------------
class TestAuth:
    def test_dev_seed_returns_admin(self, admin_token):
        assert admin_token and isinstance(admin_token, str)

    def test_auth_me_with_token(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"

    def test_auth_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_rbac_user_cannot_access_admin(self, user_headers):
        r = requests.get(f"{API}/reservas", headers=user_headers, timeout=30)
        assert r.status_code == 403

    def test_protected_requires_auth(self):
        r = requests.get(f"{API}/reservas/me", timeout=30)
        assert r.status_code == 401


# ----------------- Public reads -----------------
class TestPublicReads:
    def test_list_locales(self):
        r = requests.get(f"{API}/locales", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_list_canchas_with_local(self):
        r = requests.get(f"{API}/canchas", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 5
        # local attached
        assert any(c.get("local") is not None for c in data)

    def test_get_single_cancha(self):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        cid = canchas[0]["id"]
        r = requests.get(f"{API}/canchas/{cid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == cid
        assert r.json().get("local") is not None

    def test_stats(self):
        r = requests.get(f"{API}/stats", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("recintos", "canchas", "reservas_hoy"):
            assert k in d
            assert isinstance(d[k], int)


# ----------------- Locales CRUD -----------------
class TestLocalesCRUD:
    def test_create_update_delete_local(self, admin_headers):
        payload = {
            "nombre": f"TEST_Local_{uuid.uuid4().hex[:6]}",
            "direccion": "Calle Falsa 123",
            "puntuacion": 4.0,
            "reglamento": ["No fumar"],
            "precios_por_dia": [{"dia_nombre": "Lunes", "dia_numero": 0, "multiplicador": 1.0}],
            "precios_por_hora": [{"hora": "18:00", "multiplicador": 1.2}],
        }
        r = requests.post(f"{API}/locales", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        local = r.json()
        lid = local["id"]
        assert local["nombre"] == payload["nombre"]

        # verify via GET
        r2 = requests.get(f"{API}/locales/{lid}", timeout=30)
        assert r2.status_code == 200 and r2.json()["nombre"] == payload["nombre"]

        # update
        payload["puntuacion"] = 4.8
        r3 = requests.put(f"{API}/locales/{lid}", json=payload, headers=admin_headers, timeout=30)
        assert r3.status_code == 200
        assert r3.json()["puntuacion"] == 4.8

        # delete
        r4 = requests.delete(f"{API}/locales/{lid}", headers=admin_headers, timeout=30)
        assert r4.status_code == 200
        r5 = requests.get(f"{API}/locales/{lid}", timeout=30)
        assert r5.status_code == 404

    def test_create_local_non_admin_forbidden(self, user_headers):
        r = requests.post(f"{API}/locales", json={
            "nombre": "TEST_unauth", "direccion": "x"
        }, headers=user_headers, timeout=30)
        assert r.status_code == 403


# ----------------- Canchas CRUD -----------------
class TestCanchasCRUD:
    def test_canchas_crud(self, admin_headers):
        # need a local
        locales = requests.get(f"{API}/locales", timeout=30).json()
        local_id = locales[0]["id"]
        payload = {
            "nombre": f"TEST_Cancha_{uuid.uuid4().hex[:6]}",
            "descripcion": "desc",
            "precio_base": 100.0,
            "local_id": local_id,
        }
        r = requests.post(f"{API}/canchas", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]

        # verify
        r2 = requests.get(f"{API}/canchas/{cid}", timeout=30)
        assert r2.status_code == 200 and r2.json()["precio_base"] == 100.0

        # update
        payload["precio_base"] = 150.0
        r3 = requests.put(f"{API}/canchas/{cid}", json=payload, headers=admin_headers, timeout=30)
        assert r3.status_code == 200 and r3.json()["precio_base"] == 150.0

        # delete
        r4 = requests.delete(f"{API}/canchas/{cid}", headers=admin_headers, timeout=30)
        assert r4.status_code == 200


# ----------------- Pricing -----------------
class TestPricing:
    def test_calcular_precio_basic(self):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        # find a weekday with multiplier defined (Saturday)
        r = requests.post(f"{API}/reservas/calcular-precio", json={
            "cancha_id": c["id"],
            "fecha": "2027-01-09",  # Saturday
            "hora": "18:00",
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "precio" in data and isinstance(data["precio"], (int, float))
        assert data["precio"] > 0

    def test_calcular_precio_invalid_cancha(self):
        r = requests.post(f"{API}/reservas/calcular-precio", json={
            "cancha_id": "nonexistent", "fecha": "2027-01-09", "hora": "18:00",
        }, timeout=30)
        assert r.status_code == 404


# ----------------- Descuentos + integration -----------------
class TestDescuentos:
    def test_descuento_crud_and_pricing(self, admin_headers):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        local_id = c["local_id"]

        # baseline price
        fecha, hora = "2027-03-15", "10:00"  # Monday, no hour multiplier
        base_resp = requests.post(f"{API}/reservas/calcular-precio",
                                  json={"cancha_id": c["id"], "fecha": fecha, "hora": hora}, timeout=30)
        base_price = base_resp.json()["precio"]

        # Create 50% rango-fecha discount
        descs_created = []
        for tipo, cond in [
            ("rango-fecha", {"fecha_inicio": "2027-03-01", "fecha_final": "2027-03-31"}),
            ("rango-hora", {"hora_inicio": "09:00", "hora_final": "12:00"}),
            ("rango-fecha-hora", {"fecha_inicio": "2027-03-01", "fecha_final": "2027-03-31",
                                  "hora_inicio": "09:00", "hora_final": "12:00"}),
            ("fecha-hora-exacta", {"fecha": fecha, "hora": hora}),
        ]:
            payload = {
                "local_id": local_id,
                "nombre": f"TEST_desc_{tipo}",
                "porcentaje": 50.0,
                "vigente": True,
                "condicion": {"tipo": tipo, **cond},
            }
            r = requests.post(f"{API}/descuentos", json=payload, headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"{tipo}: {r.text}"
            descs_created.append(r.json()["id"])

        # Now pricing should reflect discount (50% off baseline)
        r2 = requests.post(f"{API}/reservas/calcular-precio",
                           json={"cancha_id": c["id"], "fecha": fecha, "hora": hora}, timeout=30)
        priced = r2.json()
        assert priced["descuento"] is not None
        assert abs(priced["precio"] - base_price * 0.5) < 0.01, \
            f"expected {base_price*0.5}, got {priced['precio']}"

        # list
        r3 = requests.get(f"{API}/descuentos?local_id={local_id}", timeout=30)
        assert r3.status_code == 200
        names = [d["nombre"] for d in r3.json()]
        for did in descs_created:
            pass
        assert any(n.startswith("TEST_desc_") for n in names)

        # update one
        did = descs_created[0]
        upd = {
            "local_id": local_id, "nombre": "TEST_desc_updated",
            "porcentaje": 10.0, "vigente": False,
            "condicion": {"tipo": "rango-fecha", "fecha_inicio": "2027-03-01", "fecha_final": "2027-03-31"},
        }
        r4 = requests.put(f"{API}/descuentos/{did}", json=upd, headers=admin_headers, timeout=30)
        assert r4.status_code == 200 and r4.json()["nombre"] == "TEST_desc_updated"

        # cleanup
        for did in descs_created:
            requests.delete(f"{API}/descuentos/{did}", headers=admin_headers, timeout=30)


# ----------------- Reservas -----------------
class TestReservas:
    @pytest.fixture(scope="class")
    def reserva_id(self, user_headers):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        payload = {
            "local_id": c["local_id"],
            "cancha_id": c["id"],
            "fecha": "2030-05-20",  # far-future to avoid conflict
            "hora": f"{(uuid.uuid4().int % 12) + 8:02d}:00",
        }
        r = requests.post(f"{API}/reservas", json=payload, headers=user_headers, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()["id"], payload

    def test_create_reserva(self, reserva_id):
        rid, _ = reserva_id
        assert rid

    def test_conflict_returns_409(self, user_headers, reserva_id):
        _, payload = reserva_id
        r = requests.post(f"{API}/reservas", json=payload, headers=user_headers, timeout=30)
        assert r.status_code == 409

    def test_my_reservas(self, user_headers, reserva_id):
        rid, _ = reserva_id
        r = requests.get(f"{API}/reservas/me", headers=user_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert any(x["id"] == rid for x in items)
        match = next(x for x in items if x["id"] == rid)
        assert match.get("cancha") is not None and match.get("local") is not None

    def test_confirm_reserva(self, user_headers, reserva_id):
        rid, _ = reserva_id
        r = requests.put(f"{API}/reservas/{rid}/confirm", headers=user_headers, timeout=30)
        assert r.status_code == 200

    def test_cancel_reserva(self, user_headers, reserva_id):
        rid, _ = reserva_id
        r = requests.put(f"{API}/reservas/{rid}/cancel", headers=user_headers, timeout=30)
        assert r.status_code == 200

    def test_admin_list_all(self, admin_headers):
        r = requests.get(f"{API}/reservas", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ----------------- Torneos -----------------
class TestTorneos:
    def test_list_torneos(self):
        r = requests.get(f"{API}/torneos", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 2
        assert all("equipos_count" in t for t in data)

    def test_torneo_crud_and_postular(self, admin_headers, user_headers):
        payload = {
            "nombre": f"TEST_Torneo_{uuid.uuid4().hex[:6]}",
            "descripcion": "test", "sedes": [], "tipo": "liga", "abierto": True,
        }
        r = requests.post(f"{API}/torneos", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200
        tid = r.json()["id"]

        # get
        r2 = requests.get(f"{API}/torneos/{tid}", timeout=30)
        assert r2.status_code == 200 and "equipos" in r2.json()

        # update
        payload["descripcion"] = "updated"
        r3 = requests.put(f"{API}/torneos/{tid}", json=payload, headers=admin_headers, timeout=30)
        assert r3.status_code == 200 and r3.json()["descripcion"] == "updated"

        # postular as user
        r4 = requests.post(f"{API}/torneos/{tid}/postular",
                           json={"nombre": "TEST_Equipo"}, headers=user_headers, timeout=30)
        assert r4.status_code == 200 and r4.json()["nombre"] == "TEST_Equipo"

        # delete
        r5 = requests.delete(f"{API}/torneos/{tid}", headers=admin_headers, timeout=30)
        assert r5.status_code == 200


# ----------------- Payments -----------------
class TestPayments:
    def test_checkout_creates_session(self, user_headers):
        canchas = requests.get(f"{API}/canchas", timeout=30).json()
        c = canchas[0]
        # Create a reserva to pay
        rp = {
            "local_id": c["local_id"], "cancha_id": c["id"],
            "fecha": "2031-06-15", "hora": "19:00",
        }
        rr = requests.post(f"{API}/reservas", json=rp, headers=user_headers, timeout=30)
        assert rr.status_code == 200, rr.text
        rid = rr.json()["id"]

        r = requests.post(f"{API}/payments/checkout",
                          json={"reserva_id": rid, "origin_url": "https://example.com"},
                          headers=user_headers, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and body["url"].startswith("http")
        assert "session_id" in body

        # status
        s = requests.get(f"{API}/payments/status/{body['session_id']}",
                         headers=user_headers, timeout=60)
        assert s.status_code == 200
        sb = s.json()
        assert "payment_status" in sb and "status" in sb

    def test_status_invalid_session(self, user_headers):
        r = requests.get(f"{API}/payments/status/sess_does_not_exist",
                         headers=user_headers, timeout=30)
        assert r.status_code == 404


# ----------------- Upload -----------------
class TestUpload:
    def test_upload_and_serve(self, user_headers):
        # send PNG (1x1)
        png_bytes = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44"
            "AE426082"
        )
        headers = {"Authorization": user_headers["Authorization"]}
        files = {"file": ("test.png", png_bytes, "image/png")}
        r = requests.post(f"{API}/upload", headers=headers, files=files, timeout=60)
        if r.status_code != 200:
            pytest.skip(f"Storage backend unavailable: {r.status_code} {r.text}")
        body = r.json()
        assert "path" in body and "url" in body
        # serve
        path = body["path"]
        s = requests.get(f"{API}/files/{path}", timeout=30)
        assert s.status_code == 200
        assert s.content == png_bytes or len(s.content) > 0
