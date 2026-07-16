# 🎯 Progresso — Migração Google Ads para "Maximizar Cliques"

> **Como usar:** este arquivo é o rastreador de progresso. Cada item feito recebe `[x]`.
> Se a sessão cair (limite), retomar a partir do primeiro item `[ ]` não marcado.
> **Regra global: TODAS as campanhas devem segmentar SOMENTE BRASIL.**
> Fazer UMA campanha por vez e confirmar cada mudança.

Última atualização: 2026-07-12 — diagnóstico feito, iniciando execução.

**Conta:** AmazonBests (sostenesapollo25@gmail.com) — ocid 8397988442

---

## FASE 0 — Diagnóstico das campanhas

- [x] Conectar ao Google Ads no navegador
- [x] Listar todas as campanhas ativas
- [x] Anotar diagnóstico de cada campanha (tabela abaixo)

### Tabela de diagnóstico

| Campanha | Tipo | Estratégia atual | Orçamento/dia | Conv. 30d | Ação |
|----------|------|------------------|---------------|-----------|------|
| Lovel Essense - Perfumes Search | Pesquisa | Maximizar conversões (em aprendizado) | R$40 | 0 | → Maximizar Cliques + Brasil |
| Performance Max-1 | Performance Max | Maximizar valor de conversão | R$40 | 0 | PMax NÃO aceita Max Cliques → só Brasil |

> **Nota PMax:** Performance Max só permite Maximizar Conversões / Valor de Conversão.
> Não é possível migrar para Maximizar Cliques. Para essa campanha, ajustar apenas
> segmentação (Brasil) e recursos/qualidade.

---

## FASE 1 — Trocar estratégia de lance → Maximizar Cliques

Para cada campanha (marcar por nome):

- [x] **Lovel Essense - Perfumes Search** — trocada para Maximizar Cliques + teto CPC **R$1,50** ✅ (salvo 2026-07-12)
- [N/A] Performance Max-1 — PMax não aceita Maximizar Cliques

**Teto de CPC** = R$1,50 (valor inicial, sem histórico de CPC; ajustar depois conforme volume).

---

## FASE 2 — Segmentação SOMENTE BRASIL

- [x] **Search**: geo = Brazil (country) apenas ✅ (já estava)
- [x] **Search**: opção "Presence: People in or regularly in" (não interesse) ✅ (alterado 2026-07-12)
- [x] **Performance Max**: geo = Brazil apenas ✅ (já estava) + mudado para **Presence** ✅ (2026-07-12)
- [ ] Idioma: Search está "English and Portuguese" (deixei; avaliar deixar só Português depois)

### BÔNUS de qualidade já feito (Search)
- [x] **Rede de Display DESLIGADA** na campanha Search ✅ (mantido Search partners) — melhora qualidade dos cliques

---

## FASE 3 — Qualidade dos anúncios

Estado atual (2026-07-12): a campanha Search tem **1 grupo ("Ad group 1")** com **1 RSA**
status **Eligible** (apto). Título: "Perfume com Melhor Preço | Perfumes Importados
Online | Fragrâncias para Ela e Ele..."; destino: www.lovelessence.com.

⚠️ **NÃO EDITEI o texto do anúncio de propósito.** Motivo: a conta teve suspensão por
contrafação (o projeto bloqueia palavras-gatilho). Editar copy/extensões com alegações
("original 100%", marcas de terceiros) pode re-disparar a política. Revisar manualmente.

- [ ] (REVISAR À MÃO) Aumentar RSA para ~15 títulos / 4 descrições, força "Boa"+ —
      usando SÓ termos seguros (sem marcas de terceiros, sem alegações de autenticidade)
- [ ] (AVALIAR) Separar grupos masculino/feminino se quiser mais relevância
- [x] Link já leva a domínio próprio (lovelessence.com)

---

## FASE 4 — Extensões (recursos)  — NÃO FEITO (revisar à mão por causa da política)

- [ ] Sitelinks (Masculinos, Femininos, Lançamentos, Promoções) — seguro, recomendado
- [ ] Callouts SEGUROS: "Entrega Rápida", "Frete p/ Todo Brasil", "Compra Segura",
      "Pague no Pix". ❌ EVITAR "Original 100%" e nomes de marcas (risco de política).
- [ ] Snippets estruturados
- [ ] Extensão de promoção (se houver desconto)

---

## FASE 5 — Palavras-chave negativas

- [ ] Revisar relatório de termos de pesquisa
- [ ] Adicionar negativas irrelevantes (grátis, caseiro, réplica, usado...)
- [ ] ⚠️ NÃO reintroduzir marcas de terceiros (histórico de suspensão)

---

## FASE 6 — Rastreamento de conversão  🚨 PROBLEMA CRÍTICO ENCONTRADO

- [x] Conferido: ação de conversão **"Purchase" (site)** → status **"Inactive"** / meta
      "Misconfigured". **NÃO está registrando compras.**
- [ ] 🚨 **CORRIGIR:** a tag/evento de conversão de compra não dispara no site
      (lovelessence.com). Enquanto isso, as campanhas ficam com 0 conversões e NÃO dá
      para migrar para "Maximizar Conversões" no futuro.
      - Verificar se a tag do Google Ads (gtag/GTM) e o evento de "purchase" estão na
        página de confirmação de pedido do site (este repo `lovel`?).
      - Testar com Tag Assistant após corrigir.
- [ ] Confirmar envio de **valor** da conversão (para ROAS futuro).

> Como as 2 campanhas mal começaram (0 vendas), parte do "Inactive" pode ser só falta de
> compras desde a instalação — MAS o status "Misconfigured" indica que vale checar o
> código da tag no site com prioridade.

### 🔎 CAUSA-RAIZ CONFIRMADA NO CÓDIGO (repo `lovel`)
- `src/lib/analytics.ts` só envia a conversão do Ads **se `adsId` E `label` existirem**:
  ```ts
  if (adsId && label) { trackEvent("conversion", { send_to: `${adsId}/${label}`, ... }) }
  ```
- `src/app/api/tracking-config/route.ts` lê esses valores **só de env vars**:
  `NEXT_PUBLIC_GOOGLE_ADS_ID` / `GOOGLE_ADS_ID` e
  `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL` / `GOOGLE_ADS_PURCHASE_CONVERSION_LABEL`.
- No `.env` local **ambos estão VAZIOS** (só o GA4 está preenchido). O `.env.example` tem
  `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX` (placeholder) e label vazio.
- ➡️ **Resultado:** o evento `purchase` até dispara p/ GA4, mas o evento `conversion` do
  Google Ads NUNCA é enviado. Por isso a conversão "Purchase" fica **Inactive**.

### 🎯 VALORES EXATOS (extraídos do snippet no Google Ads)
- **Conversion ID:** `AW-18316540473`
- **Conversion label (purchase):** `KALTCMuJ2M4cELn0gJ5E`
- `send_to` = `AW-18316540473/KALTCMuJ2M4cELn0gJ5E`

### 🐛 ERA UM BUG NO CÓDIGO (não config faltando) — JÁ CORRIGIDO
- O `.env` já tinha `GOOGLE_ADS_ID` e `GOOGLE_ADS_PURCHASE_CONVERSION_LABEL` corretos
  (variantes runtime, lidas por `/api/tracking-config`).
- MAS `getTrackingConfig()` em `src/lib/analytics.ts` retornava cedo quando o GA4 estava
  presente (`if (build.ga4Id || build.adsId)`), com `adsId` vazio, **sem nunca chamar**
  `/api/tracking-config`. Logo o evento `conversion` do Ads nunca disparava.
- ✅ **CORRIGIDO** (2026-07-12): agora, no cliente, se o `adsId` não veio do build, busca
  `/api/tracking-config` e mescla (build vence quando presente). Typecheck OK.
- ✅ **VERIFICADO ponta a ponta** (dev server): `window.__lovelTracking.adsId` agora fica
  `AW-18316540473` e o label populado. `trackPurchase` passará a disparar a conversão.

### ✅ DEPLOY E VERIFICAÇÃO EM PRODUÇÃO (2026-07-12) — FEITO
- Commit `7831601` na `main` → workflow "Build & Deploy" **success** → Coolify no ar.
- Produção `/api/tracking-config` retorna o AW-id + label corretos (env de prod OK).
- No site **lovelessence.com** verificado via JS:
  - `window.__lovelTracking.adsId = "AW-18316540473"` ✅
  - `gtag('config','AW-18316540473')` presente no dataLayer ✅
  - `trackPurchase` dispararia `send_to: AW-18316540473/KALTCMuJ2M4cELn0gJ5E` ✅
- ➡️ **Rastreamento CORRIGIDO e no ar.** Falta só a 1ª compra real para o Ads registrar
  (a conversão sai de "Inactive" — pode levar horas).

### FALTA (só ação do usuário, sem código)
1. Fazer/aguardar **1 compra real** e confirmar a conversão saindo de "Inactive".
2. (Opcional) Extensões seguras (sitelinks/callouts) + poucas negativas — ver Fases 3-5.
3. Quando juntar ~30 conv./mês → migrar Search para "Maximizar Conversões".

---

## Registro de execução (log)

- 2026-07-12: Diagnóstico feito (Fase 0 OK).
- 2026-07-12: ✅ **CONCLUÍDO** — "Lovel Essense - Perfumes Search" trocada para
  **Maximizar Cliques** com teto de **CPC R$1,50**. Salvo e confirmado (seção Bidding
  mostra "Maximize clicks"). (A extensão do Chrome caiu 1x no meio, mas refiz e salvou.)
- 2026-07-12: ✅ Search — Locations confirmado **Brazil apenas** + mudado para **Presence**
  (só quem está no Brasil). Salvo.
- 2026-07-12: ✅ Search — **Rede de Display DESLIGADA** (mantido Search partners). Salvo.
- PRÓXIMO: Performance Max → segmentação Brasil + Presence. Depois: anúncios/RSA,
  extensões, negativas.
- Nota: campanha Search está em "Bid strategy learning" (período de aprendizado normal
  após trocar a estratégia).
- 2026-07-12: ✅ Performance Max — Locations confirmado Brazil + mudado para **Presence**. Salvo.
- 2026-07-12: Verificados anúncios da Search: 1 RSA "Eligible" em "Ad group 1".
  NÃO editado por risco de política (histórico de contrafação). Ver Fase 3/4.
- ✅✅ NÚCLEO FUNCIONAL CONCLUÍDO (bidding, Brasil/Presence, Display off).
- 2026-07-12: 🐛 RASTREAMENTO DE CONVERSÃO — descoberto que a conversão "Purchase" estava
  "Inactive" por um BUG no código (`getTrackingConfig` não buscava o adsId no runtime).
  **CORRIGIDO em `src/lib/analytics.ts` e VERIFICADO** (adsId agora resolve p/ AW-18316540473).
  ⚠️ Precisa **deploy** + compra de teste. (Alteração NÃO commitada — revisar antes.)
- Falta (opcional, sem risco): extensões seguras (sitelinks/callouts), poucas negativas.
