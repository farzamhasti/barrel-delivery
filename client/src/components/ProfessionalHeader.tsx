import React from "react";

interface ProfessionalHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  logoUrl?: string;
  logoAlt?: string;
}

export function ProfessionalHeader({
  title = "Barrel Delivery",
  subtitle = "The Barrel Restaurant (Pizza & Pasta)",
  showLogo = true,
  logoUrl = "/manus-storage/logo_dceb0304.png",
  logoAlt = "The Barrel Restaurant (Pizza & Pasta)",
}: ProfessionalHeaderProps) {
  return (
    <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-white/95 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showLogo && (
            <img 
              src={logoUrl}
              alt={logoAlt}
              className="h-14 w-auto object-contain drop-shadow-sm"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
