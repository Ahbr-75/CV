// functions/api/chat.js
// Cloudflare Pages Function - Assistant d'Information Association Musulmane Chalon (El-Fath)

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

    const systemPrompt = `Tu es l'assistant virtuel d'information de l'Association Musulmane El-Fath de Chalon-sur-Saône.
Ton rôle est de fournir des réponses factuelles, apaisées, respectueuses et précises aux citoyens, fidèles et journalistes s'informant sur la situation de la mosquée et de l'association.

CONTEXTE FACTUEL :
- Le 16 novembre 2026, la municipalité de Chalon-sur-Saône (portée par le maire Gilles Platret) a fait procéder au changement des serrures et à la reprise de possession du bâtiment situé au 4, rue Edgar-Quinet (ancienne halle Sainte-Marie).
- Ce bâtiment abritait le centre culturel et cultuel musulman El-Fath depuis 1978/1979 (soit près de 47 ans d'ancrage local).
- La décision fait suite à une ordonnance du Tribunal Administratif de Dijon (rendue en septembre 2026) motivée par le strict respect de la loi de 1905 concernant la mise à disposition gratuite de locaux municipaux pour le culte.
- L'association exprime la tristesse et l'incompréhension des fidèles face à l'absence de solution de repli ou d'accueil alternative.
- L'association prône le calme, le respect des lois de la République, le refus de toute provocation et appelle au dialogue constructif avec les autorités.

CONSIGNES DE RÉPONSE :
1. Reste neutre, mesuré, digne, républicain et apaisé.
2. Réponds directement en français (ou dans la langue de la question).
3. Ne diffuse aucun message de haine ni de provocation.
4. Encourage le dialogue et la recherche de solutions concertées pour l'exercice du culte dans le respect des lois.`;

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

    let aiResponse = null;
    let lastError = null;

    for (const model of models) {
      try {
        aiResponse = await env.AI.run(model, {
          messages: messagesPayload,
          max_tokens: 500,
          temperature: 0.4
        });
        if (aiResponse && (aiResponse.response || aiResponse.text)) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!aiResponse) {
      throw lastError || new Error("Aucun modèle IA disponible.");
    }

    const responseText = aiResponse.response || aiResponse.text || "Pas de réponse générée.";

    return new Response(JSON.stringify({ response: responseText }), { headers });

  } catch (error) {
    return new Response(JSON.stringify({
      error: "Une erreur est survenue lors du traitement.",
      details: error.message
    }), {
      status: 500,
      headers
    });
  }
}
