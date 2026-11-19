// functions/api/chat.js
// Cloudflare Pages Function - Assistant IA d'Information pour l'Association El-Fath Chalon

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

    const systemPrompt = `Tu es l'assistant virtuel d'information officiel de l'Association Culturelle et Cultuelle El-Fath à Chalon-sur-Saône.
Ton rôle est d'informer les fidèles, les citoyens et les médias avec sobriété, clarté, impartialité et un esprit d'apaisement et de respect républicain.

CONTEXTE ET FAITS OFFICIELS :
1. Événements du 16 Novembre 2026 :
   - Reprise de possession par la municipalité des locaux communaux de la rue Edgar-Quinet (ancienne halle Sainte-Marie), occupés à titre gracieux depuis 1978/1979.
   - Décision suite à l'ordonnance d'expulsion rendue le 22 septembre 2026 par le Tribunal Administratif de Dijon au motif du respect de la loi de 1905 sur la laïcité.
   - L'association avait proposé une contribution financière de 12 000 €/an qui n'a pas abouti à un accord.

2. POSTURE DE L'ASSOCIATION :
   - Appel au calme, à la dignité et au respect des décisions de justice et des institutions républicaines.
   - Refus de toute surenchère ou polémique.
   - Recherche active de solutions de relogement et d'espaces privés pour l'exercice du culte et les activités culturelles.

CONSIGNES DE RÉPONSE :
- Réponds avec sérénité, empathie, précision et civisme.
- Évite toute déclaration polémique, violente ou partisane.
- Encourage le dialogue constructif.`;

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
      "@cf/meta/llama-3-8b-instruct"
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
        if (aiResponse && aiResponse.response) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!aiResponse || !aiResponse.response) {
      throw lastError || new Error("Aucun modèle n'a pu répondre.");
    }

    return new Response(JSON.stringify({ response: aiResponse.response }), { headers });

  } catch (error) {
    return new Response(JSON.stringify({
      error: "Une erreur est survenue lors de la communication avec l'assistant.",
      details: error.message
    }), { status: 500, headers });
  }
}
