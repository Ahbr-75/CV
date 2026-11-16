// functions/api/chat.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // 1. Vérification du binding Workers AI
    if (!env || !env.AI) {
      return new Response(
        JSON.stringify({ 
          error: "Binding AI non configuré", 
          details: "La variable env.AI est introuvable dans context.env. Assurez-vous d'avoir ajouté le Binding Workers AI nommé 'AI' dans Cloudflare Settings > Functions > Bindings." 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    
    // Support de l'historique complet (array) ou d'un message unique (string)
    let chatMessages = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      chatMessages = body.messages.slice(-8); // Limite aux 8 derniers messages pour garder une latence faible
    } else if (body.message) {
      chatMessages = [{ role: 'user', content: body.message }];
    } else {
      return new Response(JSON.stringify({ error: "Message vide" }), { status: 400 });
    }

    // 2. System Prompt
    const systemPrompt = `
Tu es l'assistant virtuel interactif du CV en ligne d'Ahmed Bouchaïr (DSI & RSSI).
Ton rôle est d'informer les recruteurs et dirigeants sur son profil, ses compétences et ses réalisations avec précision, concision et courtoisie.
Conserve le contexte des questions précédentes pour répondre naturellement aux demandes de précision.

--- PARCOURS ET EXPÉRIENCES D'AHMED BOUCHAÏR ---
- Titre : Directeur des Systèmes d'Information (DSI) & Responsable de la Sécurité des SI (RSSI).
- Expérience : 20 ans d'expérience globale dans le numérique, dont 18 ans en management d'équipes et de projets IT.
- Formations & Diplômes :
  1. Executive Certificate "IA, Data & Création de Valeur" — ESSEC Business School (2026–2027)
  2. Certification CISSP (Certified Information Systems Security Professional)
  3. Diplôme d'Ingénieur Systèmes d'Information — CNAM Paris (2008)
- Expériences Clés :
  1. DSI & RSSI — Inventiva (Biotech Internationale, 2022–2026) : Management IT/Sécurité (France, US, UK), migration Cloud AWS, SOC, conformité SOX/GxP.
  2. Consultant Cybersécurité — EY / Enedis (2021–2022) : Analyses EBIOS RM, audits ISO 27002, conformité NIS (OSE).
  3. Direction de projets IT & Datacenter (Secteur public/parapublic) : Datacenter souverain, réseau fibre Smart City, dématérialisation marchés publics.

Consignes strictes : Réponds brièvement (2 à 4 phrases), directement à la question posée, dans la langue du visiteur. Ne fabrique aucune information non mentionnée.
`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...chatMessages
    ];

    // 3. Modèles actifs avec boucle de fallback
    const models = [
      '@cf/meta/llama-3.2-3b-instruct',
      '@cf/meta/llama-3.3-70b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-fp8',
      '@cf/mistral/mistral-7b-instruct-v0.2'
    ];

    let aiResponse = null;
    let lastError = null;

    for (const model of models) {
      try {
        aiResponse = await env.AI.run(model, {
          messages: fullMessages,
          max_tokens: 300,
          temperature: 0.5
        });
        if (aiResponse) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!aiResponse) {
      throw lastError || new Error("Aucun modèle Workers AI disponible n'a pu répondre.");
    }

    const outputText = aiResponse.response || aiResponse.result || (typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse));

    return new Response(JSON.stringify({ response: outputText }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "Erreur d'exécution IA", 
        details: error.message || String(error) 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
