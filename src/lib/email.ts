import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { interpolateTemplate } from "@/lib/utils";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurado");
  return new Resend(apiKey);
}

function fromAddress() {
  return process.env.RESEND_FROM || "LOVEL <noreply@lovel.com>";
}

export function renderEmailHtml(body: string) {
  const htmlBody = body
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;line-height:1.6;color:#1a1a1a;">${line}</p>` : ""))
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>LOVEL</title></head>
<body style="margin:0;padding:24px;background:#f8f6f3;font-family:Montserrat,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e4df;">
    <tr><td style="padding:28px 24px 8px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:0.25em;color:#0a0a0a;">LOVEL</div>
      <div style="font-size:10px;letter-spacing:0.15em;color:#c9a962;margin-top:4px;">BOUTIQUE · ESSENCE · SOIN</div>
    </td></tr>
    <tr><td style="padding:8px 24px 28px;">${htmlBody}</td></tr>
  </table>
</body>
</html>`;
}

export async function sendTemplateEmail(input: {
  to: string;
  subject: string;
  body: string;
  template: string;
  userId?: string;
}) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: renderEmailHtml(input.body),
  });

  if (error) throw new Error(error.message);

  await prisma.emailLog.create({
    data: {
      userId: input.userId,
      userEmail: input.to,
      template: input.template,
      subject: input.subject,
    },
  });

  return data;
}

export async function sendInterpolatedEmail(input: {
  to: string;
  template: string;
  subject: string;
  bodyTemplate: string;
  vars: Record<string, string>;
  userId?: string;
}) {
  const subject = interpolateTemplate(input.subject, input.vars);
  const body = interpolateTemplate(input.bodyTemplate, input.vars);
  return sendTemplateEmail({
    to: input.to,
    subject,
    body,
    template: input.template,
    userId: input.userId,
  });
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}
