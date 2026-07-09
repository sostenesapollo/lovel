import { createHash, randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth";
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isEmailConfigured, sendInterpolatedEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/seo/site";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { token, expiresAt };
}

export function resetPasswordUrl(token: string) {
  return absoluteUrl(`/conta/senha?token=${token}`);
}

async function sendPasswordEmail(
  templateId: Extract<EmailTemplateId, "set_password" | "reset_password">,
  user: { id: string; email: string; name: string },
  token: string,
) {
  if (!isEmailConfigured()) {
    console.warn(`[password-reset] RESEND_API_KEY ausente — link: ${resetPasswordUrl(token)}`);
    return;
  }

  const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return;

  try {
    await sendInterpolatedEmail({
      to: user.email,
      template: template.id,
      subject: template.subject,
      bodyTemplate: template.body,
      vars: {
        name: user.name,
        resetUrl: resetPasswordUrl(token),
      },
      userId: user.id,
    });
  } catch (err) {
    console.error(`[password-reset] failed to send ${templateId}:`, err);
  }
}

export async function sendSetPasswordEmail(user: {
  id: string;
  email: string;
  name: string;
}) {
  const { token } = await createPasswordResetToken(user.id);
  await sendPasswordEmail("set_password", user, token);
  return token;
}

export async function sendResetPasswordEmail(user: {
  id: string;
  email: string;
  name: string;
}) {
  const { token } = await createPasswordResetToken(user.id);
  await sendPasswordEmail("reset_password", user, token);
  return token;
}

/**
 * Cria/vincula conta do comprador guest.
 * Se `issueSetPasswordLink` for true (padrão), gera token e devolve a URL —
 * o e-mail do pedido usa esse link (não envia e-mail separado).
 */
export async function ensureCustomerFromOrder(input: {
  email: string;
  name?: string;
  orderId: string;
  issueSetPasswordLink?: boolean;
}): Promise<{
  user: { id: string; email: string; name: string; status: string };
  accountUrl: string | null;
  created: boolean;
} | null> {
  const email = input.email.toLowerCase().trim();
  if (!email) return null;

  const issueLink = input.issueSetPasswordLink !== false;
  const name = (input.name?.trim() || email.split("@")[0] || "Cliente").slice(0, 80);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.status === "REVOKED") {
      return { user: existing, accountUrl: null, created: false };
    }
    await prisma.order.updateMany({
      where: { userEmail: email, userId: null },
      data: { userId: existing.id },
    });
    await prisma.order.update({
      where: { id: input.orderId },
      data: { userId: existing.id, userEmail: email },
    });

    // Conta já existia: link vai para /conta (login). Só gera set-password se pedir.
    return {
      user: existing,
      accountUrl: absoluteUrl("/conta"),
      created: false,
    };
  }

  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  await prisma.order.updateMany({
    where: { userEmail: email, userId: null },
    data: { userId: user.id },
  });
  await prisma.order.update({
    where: { id: input.orderId },
    data: { userId: user.id, userEmail: email },
  });

  let accountUrl: string | null = absoluteUrl("/conta");
  if (issueLink) {
    const { token } = await createPasswordResetToken(user.id);
    accountUrl = resetPasswordUrl(token);
  }

  return { user, accountUrl, created: true };
}

export async function findValidResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return null;
  }
  if (record.user.status === "REVOKED") return null;
  return record;
}

export async function consumeResetToken(rawToken: string, newPassword: string) {
  const record = await findValidResetToken(rawToken);
  if (!record) return null;

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, NOT: { id: record.id } },
    }),
  ]);

  return record.user;
}

/** Para "esqueci a senha": cria conta se só houver pedidos com o e-mail. */
export async function requestPasswordAccess(emailRaw: string) {
  const email = emailRaw.toLowerCase().trim();
  if (!email) return;

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const order = await prisma.order.findFirst({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
    });
    if (!order) return;

    const customer = order.customer as { name?: string } | null;
    const name = (customer?.name?.trim() || email.split("@")[0] || "Cliente").slice(0, 80);
    const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
    user = await prisma.user.create({
      data: { email, name, passwordHash, role: "CUSTOMER" },
    });
    await prisma.order.updateMany({
      where: { userEmail: email, userId: null },
      data: { userId: user.id },
    });
    await sendSetPasswordEmail(user);
    return;
  }

  if (user.status === "REVOKED") return;
  await sendResetPasswordEmail(user);
}
