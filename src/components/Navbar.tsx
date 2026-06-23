"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Cotizador" },
  { href: "/historial", label: "Historial" },
  { href: "/catalogo", label: "Catálogo" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-black border-b border-xeryus-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-8 h-14">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://xeryusinvest.com/wp-content/uploads/2026/01/Xeryus-Logo-White-1024x282.webp"
            alt="XERYUS"
            className="h-7 w-auto object-contain"
          />
        </Link>

        {/* Separador */}
        <div className="h-5 w-px bg-xeryus-border hidden sm:block" />
        <span className="text-xeryus-muted text-xs hidden sm:block tracking-widest uppercase">
          Cotizador
        </span>

        {/* Nav links */}
        <nav className="flex gap-1 ml-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                pathname === link.href
                  ? "bg-xeryus-red text-white"
                  : "text-xeryus-muted hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
