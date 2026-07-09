export type NtfyNotification = {
  title: string;
  message: string;
  tags?: string[];
  priority?: number;
  click?: string;
};

/** ntfy.sh rejects dots in topic names — lovelessence.com → lovelessence-com */
export function getNtfyTopic(): string {
  const raw = process.env.NTFY_TOPIC?.trim() || "lovelessence-com";
  return raw.replace(/\./g, "-");
}

export async function sendNtfyNotification(input: NtfyNotification): Promise<void> {
  const topic = getNtfyTopic();

  try {
    const response = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: input.title.slice(0, 250),
        message: input.message,
        tags: input.tags,
        priority: input.priority,
        click: input.click,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error(`[ntfy] HTTP ${response.status} ao publicar em ${topic}`);
    }
  } catch (error) {
    console.error("[ntfy] Falha ao enviar notificação:", error);
  }
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://lovel.giftsqr.com").replace(
    /\/$/,
    "",
  );
}

export async function notifyRegister(user: { name: string; email: string }) {
  await sendNtfyNotification({
    title: "LOVEL — novo cadastro",
    message: `${user.name} (${user.email}) criou uma conta.`,
    tags: ["busts_in_silhouette", "lovel"],
    priority: 3,
    click: `${appUrl()}/list-table`,
  });
}

export async function notifyLogin(user: { name: string; email: string }) {
  await sendNtfyNotification({
    title: "LOVEL — login",
    message: `${user.name} (${user.email}) entrou na conta.`,
    tags: ["key", "lovel"],
    priority: 2,
    click: `${appUrl()}/list-table`,
  });
}

export async function notifyNewOrder(order: {
  id: string;
  total: number;
  userEmail?: string | null;
  customer?: unknown;
  payment?: string;
}) {
  const customer = order.customer as { name?: string; email?: string } | null | undefined;
  const name = customer?.name ?? "cliente";
  const email = order.userEmail ?? customer?.email ?? "—";
  const total = order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  await sendNtfyNotification({
    title: "LOVEL — novo pedido",
    message: `${order.id} · ${name} (${email}) · ${total}${order.payment ? ` · ${order.payment}` : ""}`,
    tags: ["shopping_bags", "lovel"],
    priority: 4,
    click: `${appUrl()}/list-table`,
  });
}

const STATUS_LABEL: Record<string, { title: string; tags: string[]; priority: number }> = {
  pending_payment: { title: "LOVEL — aguardando pagamento", tags: ["hourglass", "lovel"], priority: 3 },
  paid: { title: "LOVEL — pedido pago", tags: ["white_check_mark", "moneybag", "lovel"], priority: 4 },
  shipped: { title: "LOVEL — pedido enviado", tags: ["package", "lovel"], priority: 3 },
  delivered: { title: "LOVEL — pedido entregue", tags: ["tada", "lovel"], priority: 3 },
  cancelled: { title: "LOVEL — pedido cancelado", tags: ["x", "lovel"], priority: 4 },
};

export async function notifyOrderStatus(
  order: { id: string; total: number; userEmail?: string | null; customer?: unknown },
  status: string,
) {
  const meta = STATUS_LABEL[status];
  if (!meta) return;

  const customer = order.customer as { name?: string } | null | undefined;
  const name = customer?.name ?? "cliente";
  const total = order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  await sendNtfyNotification({
    title: meta.title,
    message: `${order.id} · ${name} · ${total} · ${order.userEmail ?? "—"}\nStatus: ${status}`,
    tags: meta.tags,
    priority: meta.priority,
    click: `${appUrl()}/list-table`,
  });
}
