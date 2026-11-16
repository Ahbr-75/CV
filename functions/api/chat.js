// functions/api/chat.js

const ALLOWED_ORIGINS = [
  'https://cv-89q.pages.dev',
  'http://localhost:8788',
  'https://cv-89q.pages.dev/'
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

export async function onRequestOptions(context) {
  const corsHeaders = getCorsHeaders(context.request);
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
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

    const models = [
      '@cf/meta/llama-3.2-3b-instruct',
      '@cf/meta/llama-3.3-70b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-fp8',
      '@cf/mistral/mistral-7b-instruct-v0.2'
    ];

    let stream = null;
    let lastError = null;

    for (const model of models) {
      try {
        stream = await env.AI.run(model, {
          messages: fullMessages,
          stream: true,
          max_tokens: 300,
          temperature: 0.5
        });
        if (stream) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      throw lastError || new Error("Aucun modèle Workers AI disponible n'a pu répondre.");
    }

    // Envoi du flux SSE
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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

2. Fichier index.html (Mise à jour v5 - Streaming frontend)
Sur GitHub, mettez à jour votre fichier index.html avec le code téléchargé depuis le Studio (ou remplacez le bloc <script> par la gestion du ReadableStream) :

    async function sendQuery(text) {
      if (!text) return;

      const quickBox = document.getElementById('quick-questions');
      if (quickBox) quickBox.style.display = 'none';

      appendMessage(text, true);
      chatInput.value = '';

      conversationHistory.push({ role: 'user', content: text });

      const loadingId = 'loading-' + Date.now();
      appendMessage('<i>Réflexion en cours...</i>', false, false, loadingId);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          document.getElementById(loadingId)?.remove();
          const errText = errorData.details ? `⚠️ ${errorData.error}: ${errorData.details}` : (errorData.error || "Désolé, je n'ai pas pu obtenir de réponse.");
          appendMessage(errText, false, true);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          document.getElementById(loadingId)?.remove();
          const reply = data.response || data.error || "Désolé, je n'ai pas pu obtenir de réponse.";
          if (data.response) conversationHistory.push({ role: 'assistant', content: data.response });
          appendMessage(reply, false, !data.response);
          return;
        }

        // Traitement du flux Streaming (SSE)
        document.getElementById(loadingId)?.remove();
        const assistantMsgDiv = appendMessage('', false);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.response) {
                  fullText += parsed.response;
                  assistantMsgDiv.innerHTML = fullText;
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                }
              } catch (e) {}
            }
          }
        }

        if (fullText) {
          conversationHistory.push({ role: 'assistant', content: fullText });
        } else {
          assistantMsgDiv.innerHTML = "Désolé, aucune réponse n'a pu être générée.";
        }

      } catch (err) {
        document.getElementById(loadingId)?.remove();
        appendMessage('Erreur de connexion avec le serveur API.', false, true);
      }
    }
