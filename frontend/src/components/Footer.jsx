import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Twitter, Facebook, Linkedin, Headphones, Smartphone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#E8F3E4] mt-24" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-display text-2xl font-bold text-[#1F4D2A] mb-4 inline-block">OutSide</Link>
            <p className="font-display text-sm font-semibold text-[#1F4D2A] mt-3 mb-2">App OutSide</p>
            <div className="flex gap-2">
              <div className="bg-[#1F4D2A] text-white text-[10px] px-3 py-2 rounded-lg flex items-center gap-2">
                <Smartphone size={14} /> App Store
              </div>
              <div className="bg-[#1F4D2A] text-white text-[10px] px-3 py-2 rounded-lg flex items-center gap-2">
                <Smartphone size={14} /> Google Play
              </div>
            </div>
            <p className="font-display text-sm font-semibold text-[#1F4D2A] mt-6 mb-2">Contáctanos</p>
            <div className="flex gap-3">
              {[
                { Icon: Instagram, href: "https://instagram.com" },
                { Icon: Headphones, href: "/contacto" },
                { Icon: Twitter, href: "https://twitter.com" },
                { Icon: Linkedin, href: "https://linkedin.com" },
                { Icon: Facebook, href: "https://facebook.com" },
              ].map(({ Icon, href }, i) => {
                if (href.startsWith("/")) return (
                  <Link key={i} to={href} className="w-8 h-8 rounded-full bg-[#1F4D2A] text-white flex items-center justify-center hover:scale-110 transition">
                    <Icon size={14} />
                  </Link>
                );
                return (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#1F4D2A] text-white flex items-center justify-center hover:scale-110 transition">
                    <Icon size={14} />
                  </a>
                );
              })}
            </div>
          </div>

          {[
            { title: "Nosotros", items: [
              { label: "Quiénes somos", to: "/quienes-somos" },
              { label: "FAQ", to: "/faq" },
              { label: "Contáctanos", to: "/contacto" },
            ]},
            { title: "Legales", items: [
              { label: "Aviso de privacidad", to: "/privacidad" },
              { label: "Términos y condiciones", to: "/terminos" },
            ]},
            { title: "Servicios", items: [
              { label: "Reservar cancha", to: "/canchas" },
              { label: "Eventos y torneos", to: "/torneos" },
              { label: "Registra tu cancha", to: "/registra-tu-cancha" },
            ]},
            { title: "Mi cuenta", items: [
              { label: "Mis Reservas", to: "/reservas" },
              { label: "Mi perfil", to: "/dashboard" },
            ]},
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold text-[#1F4D2A] border-b border-[#1F4D2A]/30 pb-2 mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((it) => (
                  <li key={it.label}>
                    <Link to={it.to} data-testid={`footer-${it.to.slice(1)}`} className="text-xs text-[#1F4D2A]/80 hover:text-[#1F4D2A] hover:underline">{it.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-[#1F4D2A]/60 mt-10">© 2026 OutSide. Corporation OutSide S.A.S</div>
      </div>
    </footer>
  );
}
