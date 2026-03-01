// ╔══════════════════════════════════════════════════════════════╗
// ║            Cloud Functions — System Stock                    ║
// ║                                                              ║
// ║  Funções:                                                    ║
// ║  1. notificarNovaRequisicao → Admin recebe ao criar req.     ║
// ║  2. notificarStatusRequisicao → Usuário recebe quando        ║
// ║     admin muda status para entregue/aprovado/recusado        ║
// ║  3. verificarEstoqueBaixo → Alerta periódico de estoque      ║
// ╚══════════════════════════════════════════════════════════════╝

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule }                           = require("firebase-functions/v2/scheduler");
const { initializeApp }                        = require("firebase-admin/app");
const { getFirestore }                         = require("firebase-admin/firestore");
const { getMessaging }                         = require("firebase-admin/messaging");

initializeApp();
const db  = getFirestore();
const fcm = getMessaging();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Busca todos os tokens FCM dos ADMINS (app admin) */
async function getTokensAdmin() {
  const snap = await db.collection("fcm_tokens").get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

/**
 * Busca tokens FCM dos USUÁRIOS do app de requisições.
 * Filtra opcionalmente por setor para notificar só quem
 * pertence àquele setor (se você gravar o setor no token).
 */
async function getTokensReq(setor = null) {
  let q = db.collection("fcm_tokens_req");
  // Opcional: filtrar por setor se você gravar esse campo ao salvar o token
  // if (setor) q = q.where("setor", "==", setor);
  const snap = await q.get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

/**
 * Envia notificação para múltiplos tokens FCM.
 * Remove automaticamente tokens inválidos do Firestore.
 *
 * @param {string[]} tokens     - Lista de tokens FCM
 * @param {object}   notification - { title, body }
 * @param {object}   data        - Dados extras (tudo string)
 * @param {string}   colTokens   - Coleção onde estão os tokens (para limpeza)
 */
async function enviar(tokens, notification, data = {}, colTokens = "fcm_tokens") {
  if (tokens.length === 0) {
    console.log("⚠️ Nenhum token FCM encontrado.");
    return;
  }

  // FCM exige que todos os valores do data payload sejam strings
  const dataStr = {};
  Object.keys(data).forEach(k => { dataStr[k] = String(data[k] ?? ""); });

  const res = await fcm.sendEachForMulticast({
    tokens,
    notification,
    data: dataStr,
    android: {
      priority: "high",
      notification: {
        channelId: "req_stock_channel",  // ← MESMO ID em MainActivity e Manifest
        sound:     "default",
        defaultVibrateTimings: true,
      },
    },
  });

  // ── Limpar tokens inválidos ─────────────────────────────
  const invalidos = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        invalidos.push(tokens[i]);
      }
      console.error(`❌ Falha no token ${i}:`, code, r.error?.message);
    }
  });

  if (invalidos.length > 0) {
    const lote  = db.batch();
    const snap  = await db.collection(colTokens).get();
    snap.docs.forEach(d => {
      if (invalidos.includes(d.data().token)) lote.delete(d.ref);
    });
    await lote.commit();
    console.log(`🗑️ ${invalidos.length} token(s) inválido(s) removido(s) de "${colTokens}".`);
  }

  console.log(`✅ FCM: ${res.successCount} enviados, ${res.failureCount} falhas.`);
}

// ═════════════════════════════════════════════════════════════
// FUNÇÃO 1 — Nova requisição criada → notifica ADMIN
// Dispara quando qualquer coleção *_requisicoes recebe doc novo
// ═════════════════════════════════════════════════════════════
exports.notificarNovaRequisicao = onDocumentCreated(
  "{colecao}/{docId}",
  async (event) => {
    const colecao = event.params.colecao;
    if (!colecao.endsWith("_requisicoes")) return null;

    const dados = event.data?.data();
    if (!dados) return null;

    const codigo   = dados.codigo      || event.params.docId;
    const setor    = dados.setorLabel  || dados.setor || colecao;
    const solicit  = dados.solicitante || "Desconhecido";
    const qtdItens = dados.itens?.length || 0;

    console.log(`📋 Nova requisição: ${codigo} | Setor: ${setor} | Solicitante: ${solicit}`);

    const tokens = await getTokensAdmin();
    await enviar(
      tokens,
      {
        title: `📋 Nova Requisição — ${setor}`,
        body:  `${solicit} pediu ${qtdItens} item(ns) · Código: ${codigo}`,
      },
      {
        route:     "requisicoes",
        pedidoId:  codigo,
        setor:     String(setor),
        tipo:      "nova_requisicao",
      },
      "fcm_tokens"  // coleção dos tokens do admin
    );

    return null;
  }
);

// ═════════════════════════════════════════════════════════════
// FUNÇÃO 2 — Status da requisição alterado → notifica USUÁRIO
//
// Dispara quando o admin muda o campo "status" de qualquer doc
// em coleções *_requisicoes para: entregue | aprovado | recusado
//
// O usuário do app de requisições recebe a notificação no celular.
// ═════════════════════════════════════════════════════════════
exports.notificarStatusRequisicao = onDocumentUpdated(
  "{colecao}/{docId}",
  async (event) => {
    const colecao = event.params.colecao;
    if (!colecao.endsWith("_requisicoes")) return null;

    const antes  = event.data.before.data();
    const depois = event.data.after.data();

    // Só notifica se o STATUS mudou
    if (antes.status === depois.status) return null;

    const novoStatus = depois.status;
    const codigo     = depois.codigo      || event.params.docId;
    const setor      = depois.setorLabel  || depois.setor || colecao;
    const solicit    = depois.solicitante || "Usuário";
    const respAdmin  = depois.respostaAdmin || "";

    // Notifica apenas para mudanças de status relevantes
    const statusNotificaveis = ["entregue", "aprovado", "recusado"];
    if (!statusNotificaveis.includes(novoStatus)) return null;

    console.log(`🔄 Req ${codigo}: ${antes.status} → ${novoStatus} | Setor: ${setor}`);

    // ── Montar título e corpo baseado no novo status ──────
    let title, body, emoji;
    switch (novoStatus) {
      case "entregue":
        emoji = "✅";
        title = `${emoji} Requisição Entregue!`;
        body  = `Seu pedido ${codigo} foi entregue.`;
        if (respAdmin) body += ` — ${respAdmin}`;
        break;

      case "aprovado":
        emoji = "👍";
        title = `${emoji} Requisição Aprovada!`;
        body  = `Seu pedido ${codigo} foi aprovado e está sendo separado.`;
        if (respAdmin) body += ` — ${respAdmin}`;
        break;

      case "recusado":
        emoji = "❌";
        title = `${emoji} Requisição Recusada`;
        body  = `Seu pedido ${codigo} foi recusado.`;
        if (respAdmin) body += ` Motivo: ${respAdmin}`;
        else body += ` Entre em contato com o responsável.`;
        break;

      default:
        return null;
    }

    // ── Buscar tokens dos usuários do app de requisições ──
    // Se você quiser notificar só o solicitante específico,
    // grave o token junto com o nome do usuário e filtre aqui.
    const tokens = await getTokensReq(setor);

    if (tokens.length === 0) {
      console.log("⚠️ Nenhum token de usuário de requisição encontrado.");
      return null;
    }

    await enviar(
      tokens,
      { title, body },
      {
        route:     "requisicao",     // rota no app → abre a tela de requisições
        reqCodigo: codigo,
        status:    novoStatus,
        setor:     String(setor),
        tipo:      "status_requisicao",
      },
      "fcm_tokens_req"  // coleção dos tokens do app de requisições
    );

    return null;
  }
);

// ═════════════════════════════════════════════════════════════
// FUNÇÃO 3 — Verificação de estoque baixo (a cada hora)
// Notifica os ADMINS quando algum produto está abaixo do limite
// ═════════════════════════════════════════════════════════════
exports.verificarEstoqueBaixo = onSchedule("every 60 minutes", async () => {
  const colecoes = [
    "estoque_ti_produtos",
    "estoque_exfood_produtos",
    "estoque_limpeza_produtos",
    "estoque_ferramentas_produtos",
    "estoque_ferramentas_ti_produtos",
    "estoque_ferramentas_manutencao_produtos",
  ];

  const LIMITE = 5;
  const baixos = [];

  for (const col of colecoes) {
    try {
      const snap = await db.collection(col).get();
      snap.docs.forEach(d => {
        const item = d.data();
        const qtd  = item.quantidade ?? item.estoque ?? null;
        if (qtd !== null && qtd <= LIMITE && qtd >= 0) {
          baixos.push({ nome: item.nome || d.id, col, qtd });
        }
      });
    } catch (e) {
      console.warn(`Coleção ${col} não encontrada:`, e.message);
    }
  }

  if (baixos.length === 0) {
    console.log("✅ Todos os produtos com estoque OK.");
    return null;
  }

  const tokens = await getTokensAdmin();
  const nomes  = baixos.slice(0, 3).map(p => `${p.nome} (${p.qtd})`).join(", ");
  const extra  = baixos.length > 3 ? ` +${baixos.length - 3} outros` : "";

  await enviar(
    tokens,
    {
      title: `⚠️ Estoque Baixo — ${baixos.length} produto(s)`,
      body:  `Atenção: ${nomes}${extra}`,
    },
    { route: "estoque", tipo: "estoque_baixo" },
    "fcm_tokens"
  );

  return null;
});