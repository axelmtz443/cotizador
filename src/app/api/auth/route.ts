import { NextRequest, NextResponse } from "next/server";

const USUARIOS = ["kamila", "axel", "jc", "Alex"];
const PASSWORD = "GWP2026.";

export async function POST(req: NextRequest) {
  const { usuario, password } = await req.json();

  if (!USUARIOS.includes(usuario?.toLowerCase()) || password !== PASSWORD) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("xeryus_auth", "GWP2026_OK", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("xeryus_auth");
  return res;
}
