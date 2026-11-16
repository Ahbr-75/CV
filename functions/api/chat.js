// functions/api/chat.js

// Origines autorisées à solliciter l'API
const ALLOWED_ORIGINS = [
  'https://cv-89q.pages.dev',
  'http://localhost:8788',
  '[suspicious link removed]'
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://cv-89q.pages.dev';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// 1. Gestion automatique des requêtes Preflight OPTIONS
export async function onRequestOptions(context) {
  const corsHeaders = getCorsHeaders(context.request);
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// 2. Traitement des requêtes POST de chat
export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    // Vérification du binding Workers AI
    if (!env || !env.AI) {
      return new Response(
        JSON.stringify({ 
          error: "Binding AI non configuré", 
          details: "La variable env.AI est introuvable. Assurez-vous d'avoir configuré la liaison nommée 'AI' sous Cloudflare Settings > Functions > Bindings." 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Extraction des messages (mémoire multi-tours)
    let chatMessages = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      chatMessages = body.messages.slice(-8);
    } else if (body.message && typeof body.message === 'string' && body.message.trim() !== '') {
      chatMessages = [{ role: 'user', content: body.message.trim() }];
    }

    if (chatMessages.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Message vide", 
          details: "Aucun message valide n'a été reçu par l'API." 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Contexte du CV d'Ahmed Bouchaïr
    const systemPrompt = `
Tu es l'assistant virtuel interactif du CV en ligne d'Ahmed Bouchaïr (DSI & RSSI).
Ton rôle est d'informer les recruteurs et dirigeants sur son profil, ses compétences et ses réalisations avec précision, concision et courtoisie.
Conserve le contexte des messages précédents de la conversation pour répondre naturellement aux questions de suivi.

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

    // Modèles Workers AI avec système de repli
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
        ...corsHeaders,
        'Content-Type': 'application/json'
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
