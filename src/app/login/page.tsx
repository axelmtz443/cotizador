"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-xeryus-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img
            src="https://xeryusinvest.com/wp-content/uploads/2026/01/Xeryus-Logo-White-1024x282.webp"
            alt="XERYUS"
            className="h-10 object-contain"
          />
        </div>

        <div className="card p-7">
          <h1 className="text-lg font-bold text-white mb-1">Cotizador</h1>
          <p className="text-xs text-xeryus-muted mb-6">Inicia sesión para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuario"
                className="input-field"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-xeryus-muted uppercase tracking-widest block mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-xeryus-redMid bg-xeryus-red/10 border border-xeryus-redDark rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
