import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordAccess } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ success: false, message: "Informe um e-mail válido." }, { status: 400 });
  }

  // Sempre a mesma resposta — não revela se o e-mail existe.
  void requestPasswordAccess(body.data.email);

  return NextResponse.json({
    success: true,
    message: "Se este e-mail tiver pedidos ou conta, enviamos um link para definir a senha.",
  });
}
