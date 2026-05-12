import React from "react";
import StaticPage from "./StaticPage";

export function QuienesSomos() {
  return (
    <StaticPage title="Quiénes somos" accent="Sobre OutSide">
      <p className="text-[#4B5563] leading-relaxed mb-4">
        <strong>OutSide</strong> es la primera plataforma de reservas de canchas sintéticas de Barranquilla.
        Nuestra misión es conectar a jugadores con los mejores espacios deportivos de la ciudad,
        haciendo que reservar una cancha sea tan fácil como pedir un domicilio.
      </p>
      <p className="text-[#4B5563] leading-relaxed mb-4">
        Fundada en 2025 por un grupo de futbolistas amateur cansados de tener que llamar
        a cada cancha para verificar disponibilidad, hoy OutSide reúne más de 20 recintos
        afiliados y procesa más de 90 reservas diarias.
      </p>
      <h3 className="font-display text-2xl font-bold text-[#1F4D2A] mt-8 mb-3">Nuestra visión</h3>
      <p className="text-[#4B5563] leading-relaxed">
        Ser la plataforma deportiva líder en el Caribe colombiano, expandiéndonos a Santa Marta,
        Cartagena y otras ciudades en los próximos 3 años.
      </p>
    </StaticPage>
  );
}

export function Faq() {
  const faqs = [
    { q: "¿Cómo reservo una cancha?", a: "Inicia sesión con tu cuenta de Google, navega a la sección Canchas, selecciona una cancha, elige fecha y hora, y procede al pago seguro con Stripe." },
    { q: "¿Puedo cancelar mi reserva?", a: "Sí, puedes cancelar cualquier reserva desde 'Mis Reservas'. Si cancelas con más de 24 horas de anticipación, se reembolsa el 100%." },
    { q: "¿En qué moneda se cobra?", a: "Todas las reservas se procesan en Pesos Colombianos (COP)." },
    { q: "¿Cómo postulo mi equipo a un torneo?", a: "Ve a la sección Eventos, elige un torneo abierto y haz clic en 'Postularme'. Necesitas tener una cuenta para inscribirte." },
    { q: "¿Puedo registrar mi cancha en OutSide?", a: "¡Sí! Haz clic en 'Registra tu cancha' en el menú superior y llena el formulario. Nuestro equipo te contactará en 24-48 horas." },
    { q: "¿Aceptan mascotas o niños en las canchas?", a: "Depende del recinto. En la página de detalle de cada cancha verás los íconos de servicios disponibles, incluyendo si acepta niños y mascotas." },
  ];
  return (
    <StaticPage title="Preguntas frecuentes" accent="FAQ">
      <div className="space-y-5">
        {faqs.map((f, i) => (
          <div key={i} className="bg-white border border-[#E8F3E4] rounded-2xl p-5" data-testid={`faq-${i}`}>
            <h3 className="font-display font-bold text-[#1F4D2A]">{f.q}</h3>
            <p className="text-[#4B5563] mt-2">{f.a}</p>
          </div>
        ))}
      </div>
    </StaticPage>
  );
}

export function Terminos() {
  return (
    <StaticPage title="Términos y condiciones" accent="Legales">
      <p className="text-[#4B5563] leading-relaxed mb-4">
        Al usar la plataforma OutSide aceptas estos términos. OutSide actúa como intermediario
        entre usuarios y dueños de canchas; no somos responsables directos del estado físico
        de las canchas reservadas.
      </p>
      <h3 className="font-display text-xl font-bold text-[#1F4D2A] mt-6 mb-2">Reservas</h3>
      <p className="text-[#4B5563] leading-relaxed mb-4">
        Las reservas se consideran confirmadas únicamente tras recibirse el pago a través
        de nuestra pasarela. El usuario es responsable de respetar el horario reservado.
      </p>
      <h3 className="font-display text-xl font-bold text-[#1F4D2A] mt-6 mb-2">Cancelaciones</h3>
      <p className="text-[#4B5563] leading-relaxed mb-4">
        Las cancelaciones con más de 24 horas de anticipación son reembolsadas al 100%.
        Cancelaciones tardías están sujetas a la política individual de cada local.
      </p>
      <h3 className="font-display text-xl font-bold text-[#1F4D2A] mt-6 mb-2">Privacidad</h3>
      <p className="text-[#4B5563] leading-relaxed">
        Solo solicitamos el email y nombre obtenidos vía Google OAuth. No vendemos tus datos
        a terceros. Para más información consulta nuestra Política de Privacidad.
      </p>
    </StaticPage>
  );
}

export function Privacidad() {
  return (
    <StaticPage title="Aviso de privacidad" accent="Legales">
      <p className="text-[#4B5563] leading-relaxed mb-4">
        En OutSide protegemos tus datos personales conforme a la Ley 1581 de 2012 de Colombia.
        La información recolectada (email, nombre, foto) se usa únicamente para gestionar tus reservas
        y comunicarnos contigo respecto a tus actividades en la plataforma.
      </p>
      <p className="text-[#4B5563] leading-relaxed">
        Puedes solicitar la eliminación de tu cuenta y datos enviando un email a
        <strong> privacidad@outside.com.co</strong>.
      </p>
    </StaticPage>
  );
}

export function Contacto() {
  return (
    <StaticPage title="Contáctanos" accent="Estamos para ayudarte">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E8F3E4] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#1F4D2A]">Soporte general</h3>
          <p className="text-[#4B5563] mt-2">hola@outside.com.co</p>
          <p className="text-[#4B5563]">+57 318 555 0099</p>
        </div>
        <div className="bg-white border border-[#E8F3E4] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#1F4D2A]">Alianzas comerciales</h3>
          <p className="text-[#4B5563] mt-2">alianzas@outside.com.co</p>
          <p className="text-[#4B5563]">+57 318 555 0011</p>
        </div>
        <div className="bg-white border border-[#E8F3E4] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#1F4D2A]">Oficina Barranquilla</h3>
          <p className="text-[#4B5563] mt-2">Cra. 53 #82-25, oficina 502</p>
          <p className="text-[#4B5563]">Lunes a Viernes 8:00 am - 6:00 pm</p>
        </div>
        <div className="bg-white border border-[#E8F3E4] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#1F4D2A]">Soporte técnico</h3>
          <p className="text-[#4B5563] mt-2">soporte@outside.com.co</p>
          <p className="text-[#4B5563]">24/7 vía email</p>
        </div>
      </div>
    </StaticPage>
  );
}
