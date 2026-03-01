const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule }        = require("firebase-functions/v2/scheduler");
const { initializeApp }     = require("firebase-admin/app");
const { getFirestore }      = require("firebase-admin/firestore");
const { getMessaging }      = require("firebase-admin/messaging");

initializeApp();
const db  = getFirestore();
const fcm = getMessaging();

// ─── Busca todos os tokens FCM salvos no Firestore ────────────
async function getTokens() {
  const snap = await db.collection("fcm_tokens").get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

// ─── Envia para múltiplos tokens e limpa os inválidos ─────────
async function enviar(tokens, notification, data = {}) {
  if (tokens.length === 0) {
    console.log("⚠️ Nenhum token FCM cadastrado.");
    return;
  }

  const dataStr = {};
  Object.keys(data).forEach(k => { dataStr[k] = String(data[k]); });

  const res = await fcm.sendEachForMulticast({
    tokens,
    notification,
    data: dataStr,
    android: {
      priority: "high",
      notification: {
        channelId:   "park_stock_channel",
        sound:       "default",
        defaultVibrateTimings: true,
      },
    },
  });

  // Remover tokens inválidos do Firestore
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
      console.error(`❌ Token ${i} falhou:`, code);
    }
  });

  if (invalidos.length > 0) {
    const lote = db.batch();
    const snap = await db.collection("fcm_tokens").get();
    snap.docs.forEach(d => {
      if (invalidos.includes(d.data().token)) lote.delete(d.ref);
    });
    await lote.commit();
    console.log(`🗑️ ${invalidos.length} token(s) inválido(s) removido(s).`);
  }

  console.log(`✅ Enviado: ${res.successCount} ok, ${res.failureCount} falhas.`);
}

// ════════════════════════════════════════════════════════════════
// FUNÇÃO 1 — Nova requisição → notifica admin imediatamente
// Dispara quando qualquer documento é criado em coleções
// que terminam com "_requisicoes"
// ════════════════════════════════════════════════════════════════
exports.notificarNovaRequisicao = onDocumentCreated(
  "{colecao}/{docId}",
  async (event) => {
    const colecao = event.params.colecao;

    // Só processa coleções de requisições
    if (!colecao.endsWith("_requisicoes")) return null;

    const dados     = event.data?.data();
    if (!dados) return null;

    const codigo    = dados.codigo     || event.params.docId;
    const setor     = dados.setorLabel || dados.setor || colecao;
    const solicit   = dados.solicitante|| "Desconhecido";
    const qtdItens  = dados.itens?.length || 0;

    const tokens = await getTokens();

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
      }
    );

    return null;
  }
);

// ════════════════════════════════════════════════════════════════
// FUNÇÃO 2 — Verificação de estoque baixo (roda a cada 1 hora)
// Varre todas as coleções de estoque e notifica se
// algum produto estiver abaixo do limite mínimo
// ════════════════════════════════════════════════════════════════
exports.verificarEstoqueBaixo = onSchedule("every 60 minutes", async () => {

  // Todas as coleções de estoque do seu sistema
  const colecoes = [
    "estoque_ti_produtos",
    "estoque_exfood_produtos",
    "estoque_limpeza_produtos",
    "estoque_ferramentas_produtos",
    "estoque_ferramentas_ti_produtos",
    "estoque_ferramentas_manutencao_produtos",
  ];

  const LIMITE_MINIMO = 5;   // abaixo disso = estoque baixo
  const produtosBaixos = [];

  for (const col of colecoes) {
    try {
      const snap = await db.collection(col).get();
      snap.docs.forEach(d => {
        const item = d.data();
        const qtd  = item.quantidade ?? item.estoque ?? null;
        if (qtd !== null && qtd <= LIMITE_MINIMO && qtd >= 0) {
          produtosBaixos.push({
            nome:    item.nome    || d.id,
            colecao: col,
            qtd,
          });
        }
      });
    } catch (e) {
      // Coleção pode não existir ainda — ignorar
      console.warn(`Coleção ${col} não encontrada:`, e.message);
    }
  }

  if (produtosBaixos.length === 0) {
    console.log("✅ Todos os produtos com estoque OK.");
    return null;
  }

  const tokens = await getTokens();
  const nomes  = produtosBaixos.slice(0, 3).map(p => `${p.nome} (${p.qtd})`).join(", ");
  const extra  = produtosBaixos.length > 3 ? ` +${produtosBaixos.length - 3} outros` : "";

  await enviar(
    tokens,
    {
      title: `⚠️ Estoque Baixo — ${produtosBaixos.length} produto(s)`,
      body:  `Atenção: ${nomes}${extra}`,
    },
    {
      route: "estoque",
      tipo:  "estoque_baixo",
    }
  );

  return null;
});