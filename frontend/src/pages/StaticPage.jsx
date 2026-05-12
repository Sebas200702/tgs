import React from "react";

export default function StaticPage({ title, accent = "Conócenos", children }) {
  return (
    <div className="min-h-screen" data-testid="static-page">
      <section className="bg-[#D4E8C9] py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="font-hand text-2xl text-[#1F4D2A]">{accent}</p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-[#1F4D2A]">{title}</h1>
        </div>
      </section>
      <div className="max-w-3xl mx-auto px-4 py-12 prose prose-green">
        {children}
      </div>
    </div>
  );
}
