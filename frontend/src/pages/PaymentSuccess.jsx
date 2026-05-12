import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import api from "../lib/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let cancelled = false;
    const poll = async (attempt) => {
      if (cancelled) return;
      if (attempt >= 8) { setStatus("timeout"); return; }
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        setTries(attempt + 1);
        if (r.data.payment_status === "paid") { setStatus("paid"); return; }
        if (r.data.status === "expired") { setStatus("expired"); return; }
        setTimeout(() => poll(attempt + 1), 2000);
      } catch {
        setTimeout(() => poll(attempt + 1), 2000);
      }
    };
    poll(0);
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center" data-testid="payment-success-page">
      {status === "checking" && (
        <>
          <Loader2 size={64} className="mx-auto text-[#1F4D2A] animate-spin" />
          <h1 className="font-display text-3xl font-black text-[#1F4D2A] mt-6">Procesando pago...</h1>
          <p className="text-[#4B5563] mt-2">Verificando estado ({tries})</p>
        </>
      )}
      {status === "paid" && (
        <>
          <CheckCircle2 size={72} className="mx-auto text-[#1F4D2A]" />
          <h1 className="font-display text-4xl font-black text-[#1F4D2A] mt-6">¡Pago exitoso!</h1>
          <p className="text-[#4B5563] mt-2">Tu reserva ha sido confirmada. Te esperamos en la cancha.</p>
          <Link to="/reservas" className="pill-btn mt-8 inline-flex" data-testid="ver-reservas-btn">Ver mis reservas</Link>
        </>
      )}
      {(status === "expired" || status === "timeout" || status === "error") && (
        <>
          <XCircle size={64} className="mx-auto text-red-600" />
          <h1 className="font-display text-3xl font-black text-[#1F4D2A] mt-6">No pudimos confirmar el pago</h1>
          <p className="text-[#4B5563] mt-2">Por favor verifica el estado en tus reservas.</p>
          <Link to="/reservas" className="pill-btn mt-8 inline-flex">Ir a mis reservas</Link>
        </>
      )}
    </div>
  );
}
