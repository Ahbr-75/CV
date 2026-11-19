// functions/api/chat.js
// Cloudflare Pages Function - Assistant d'information officiel El-Fath

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

    const systemPrompt = `Tu es l'assistant virtuel officiel d'information de l'Association Culturelle Musulmane El-Fath à Chalon-sur-Saône.
Ton rôle est de donner aux fidèles et visiteurs des informations exactes, dignes, apaisées et conformes aux communiqués officiels.

INFORMATIONS CLÉS ET CONSIGNES STRICTES :

1. PRIÈRE DU VENDREDI 20 NOVEMBRE :
- Lieu : Salle Paroissiale de l'Église Sainte-Thérèse (Paroisse du Bon Samaritain, Chalon-sur-Saône).
- Gratitude : Remerciements chaleureux envers Monseigneur Benoît Rivière, les responsables de la paroisse du Bon Samaritain et de l'église Sainte-Thérèse pour leur magnifique geste de fraternité et d'accueil en cette période particulièrement difficile.

2. FERMETURE DU LIEU ET SITUATION :
- Le maire de Chalon-sur-Saône, M. Gilles Platret, est venu fermer la mosquée (ancienne halle Sainte-Marie, rue Edgar-Quinet) sans attendre le retour de la procédure d'appel pendante devant le Conseil d'État.
- Ne jamais employer l'expression "fermeture administrative".
- Rappeler la proposition écrite formulée par l'association de verser un loyer de 12 000 €/an (1 000 €/mois), démontrant la volonté constante de dialogue et de convention régulière.

3. VALEURS ET PRINCIPES :
- Rappel du respect de la liberté de conscience et de culte (Article 1er de la Constitution et Article 1er de la Loi de 1905).
- Appel permanent à la dignité, au calme, au respect des lois républicaines et au vivre-ensemble.
- Contact association : contact.acm.chalon@gmail.com.`;

    const messagesPayload = [
      { role: "system", content: systemPrompt }
    ];

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

    let responseText = "";
    let lastError = null;

    for (const model of models) {
      try {
        const aiRes = await env.AI.run(model, {
          messages: messagesPayload,
          max_tokens: 400,
          temperature: 0.3
        });
        if (aiRes && aiRes.response) {
          responseText = aiRes.response;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!responseText) {
      return new Response(JSON.stringify({ 
        error: "Erreur de génération par l'IA.", 
        details: lastError ? lastError.message : "Aucun modèle disponible." 
      }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ response: responseText }), { headers });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Une erreur est survenue.", 
      details: error.message 
    }), { status: 500, headers });
  }
}
