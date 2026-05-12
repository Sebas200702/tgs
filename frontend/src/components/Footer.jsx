import React from "react";
import { Instagram, Twitter, Facebook, Linkedin, Headphones, Smartphone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#E8F3E4] mt-24" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-2xl font-bold text-[#1F4D2A] mb-4">OutSide</div>
            <p className="font-display text-sm font-semibold text-[#1F4D2A] mb-2">App OutSide</p>
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
              {[Instagram, Headphones, Twitter, Linkedin, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full bg-[#1F4D2A] text-white flex items-center justify-center hover:scale-110 transition">
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: "Nosotros", items: ["Quiénes somos", "Nuestra historia", "Noticias", "Notificaciones", "Trabaja con nosotros", "Línea ética", "Información financiera"] },
            { title: "Legales", items: ["Avisos de privacidad", "Políticas", "Términos y condiciones", "Reversión de pago"] },
            { title: "Nuestros servicios", items: ["Convenios", "Buzón digital", "Preguntas frecuentes"] },
            { title: "OutSide Club", items: ["Inscríbete", "Beneficios", "Términos y condiciones"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold text-[#1F4D2A] border-b border-[#1F4D2A]/30 pb-2 mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((it) => (
                  <li key={it} className="text-xs text-[#1F4D2A]/80 hover:text-[#1F4D2A] cursor-pointer">{it}</li>
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
