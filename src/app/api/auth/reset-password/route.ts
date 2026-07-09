import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, toSafeUser } from "@/lib/auth";
import { consumeResetToken, findValidResetToken } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ valid: false });
  }
  const record = await findValidResetToken(token);
  return NextResponse.json({
    valid: Boolean(record),
    email: record?.user.email ?? null,
  });
}

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { success: false, message: "Senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }

  const user = await consumeResetToken(body.data.token, body.data.password);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Link inválido ou expirado. Solicite um novo." },
      { status: 400 },
    );
  }

  await createSession(user);
  return NextResponse.json({ success: true, user: toSafeUser(user) });
}
