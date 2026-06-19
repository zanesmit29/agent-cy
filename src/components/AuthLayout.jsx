import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e13] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <span className="font-heading text-white text-2xl tracking-tight block mb-6">Agent(cy)</span>
          <h1 className="font-heading text-white text-3xl font-medium">{title}</h1>
          {subtitle && <p className="font-sans text-white/40 mt-2 text-sm">{subtitle}</p>}
        </div>
        <div className="bg-white/5 rounded-sm border border-white/10 p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-white/30 mt-6 font-sans">{footer}</p>
        )}
      </div>
    </div>
  );
}