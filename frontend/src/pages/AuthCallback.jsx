import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const session_id = params.get("session_id");
    if (!session_id) { navigate("/"); return; }

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        setUser(r.data.user);
        // clean URL
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { state: { user: r.data.user } });
      } catch (e) {
        console.error("Auth failed", e);
        navigate("/");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#1F4D2A] border-t-transparent animate-spin" />
        <p className="mt-4 text-[#1F4D2A] font-display font-semibold">Iniciando sesión...</p>
      </div>
    </div>
  );
}
