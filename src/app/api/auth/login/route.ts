import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, toSafeUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendLoginAlertEmail, sendWelcomeEmail } from "@/lib/order-emails";
import { notifyLogin, notifyRegister } from "@/lib/ntfy";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ success: false, message: "Dados inválidos." });
  }

  const user = await prisma.user.findUnique({
    where: { email: body.data.email.toLowerCase().trim() },
  });

  if (!user || user.status === "REVOKED") {
    return NextResponse.json({ success: false, message: "E-mail ou senha incorretos." });
  }

  const valid = await verifyPassword(body.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, message: "E-mail ou senha incorretos." });
  }

  await createSession(user);
  void sendLoginAlertEmail(user);
  void notifyLogin(user);
  return NextResponse.json({ success: true, user: toSafeUser(user) });
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function PUT(request: Request) {
  const body = registerSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ success: false, message: "Preencha todos os campos." });
  }

  const email = body.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ success: false, message: "Este e-mail já está cadastrado." });
  }

  const passwordHash = await hashPassword(body.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: body.data.name,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  await createSession(user);
  void sendWelcomeEmail(user);
  void notifyRegister(user);
  return NextResponse.json({ success: true, user: toSafeUser(user) });
}
