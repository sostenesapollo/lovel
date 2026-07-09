import QRCode from "qrcode";

/** Gera PNG em base64 (sem prefixo data:) a partir do payload PIX copia-e-cola. */
export async function pixQrCodeBase64FromPayload(payload: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}
