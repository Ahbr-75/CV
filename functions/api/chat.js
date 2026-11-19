// functions/api/chat.js
// Cloudflare Pages Function - Assistant IA d'Information pour l'Association El-Fath

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

export async function onRequestPost(context) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    const { request, env } = context;
    const body = await request.json();

    let userMessage = "";
    let history = [];

    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      history = body.messages;
      userMessage = history[history.length - 1].content || "";
    } else if (body.message && typeof body.message === "string") {
      userMessage = body.message;
      history = [{ role: "user", content: userMessage }];
    }

    if (!userMessage || userMessage.trim() === "") {
      return new Response(JSON.stringify({ error: "Le message ne peut pas être vide." }), {
        status: 400,
        headers
      });
    }

    const systemPrompt = `Tu es l'assistant virtuel d'information officiel de l'Association Culturelle et Cultuelle El-Fath de Chalon-sur-Saône.
Ton rôle est d'informer les fidèles, les citoyens et les médias de manière digne, apaisée, fraternelle et respectueuse des principes républicains.

INFORMATIONS ESSENTIELLES À TRANSMETTRE :

1. PRIÈRE DU VENDREDI (INFORMATIONS URGENTES) :
- Lieu d'accueil pour la prière du vendredi 20 novembre : Salle Paroissiale de l'Église Sainte-Thérèse (Paroisse du Bon Samaritain).
- Remerciements chaleureux : L'association et l'imam expriment leur profonde gratitude à Monseigneur Benoît Rivière ainsi qu'aux responsables de la paroisse du Bon Samaritain et de l'église Sainte-Thérèse pour leur soutien et la mise à disposition solidaire de la salle.

2. CONTEXTE ET HISTORIQUE :
- La mosquée de la rue Edgar-Quinet (ancienne halle Sainte-Marie) accueillait les fidèles depuis 1978.
- Fermeture le 16 novembre 2026 suite à une reprise de possession par la municipalité (Gilles Platret).
- L'association a fait un pas vers la mairie en proposant par écrit un loyer de 12 000 €/an (1 000 €/mois), mais les démarches n'ont pas abouti et la procédure d'appel devant le Conseil d'État est en cours.

3. VALEURS ET POSTURE :
- Appel au calme, à la dignité, au respect des lois républicaines et au vivre-ensemble.
- Rappel des textes constitutionnels (Article 1er de la Constitution, Loi du 9 décembre 1905 sur la liberté de conscience et le libre exercice des cultes).`;

    const messagesPayload = [{ role: "system", content: systemPrompt }];
    for (const msg of history) {
      if (msg.role && msg.content) {
        messagesPayload.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        });
      }
    }

    const models = [
      "@cf/meta/llama-3.3-70b-instruct",
      "@cf/meta/llama-3.2-3b-instruct",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistral/mistral-7b-instruct-v0.1"
    ];

    let aiResponse = null;
    let lastError = null;

    for (const model of models) {
      try {
        aiResponse = await env.AI.run(model, {
          messages: messagesPayload,
          max_tokens: 450,
          temperature: 0.3
        });
        if (aiResponse && (aiResponse.response || aiResponse.description)) break;
      } catch (err) {
        lastError = err;
      }
    }

    const textOutput = aiResponse?.response || aiResponse?.description || "Bonjour, l'information demandée est disponible dans les communiqués officiels.";

    return new Response(JSON.stringify({ response: textOutput }), { headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Une erreur est survenue lors de la communication avec l'assistant." }), {
      status: 500,
      headers
    });
  }
}
