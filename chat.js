// functions/api/chat.js - Cloudflare Worker API v7

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
  return new Response(null, { status: 204, headers: getCorsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);
  try {
    if (!env || !env.AI) {
      return new Response(JSON.stringify({ error: 'Binding AI non configure' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const body = await request.json().catch(() => ({}));
    let chatMessages = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      chatMessages = body.messages.slice(-8);
    } else if (body.message && typeof body.message === 'string' && body.message.trim() !== '') {
      chatMessages = [{ role: 'user', content: body.message.trim() }];
    }
    if (chatMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Message vide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `Tu es l'assistant virtuel interactif officiel d'Ahmed Bouchair (DSI / CIO & RSSI).
Ton role est d'informer les recruteurs, de realiser des analyses d'adequation (Job Matching) et de generer des lettres de motivation ciblees sur-mesure.

1. IDENTITE & SYNTHESE EXECUTIVES :
- Nom : Ahmed BOUCHAIR
- Titre : Directeur des Systemes d'Information (DSI / CIO) & Responsable de la Securite des SI (RSSI)
- Experience : 20 ans d'experience globale dans le numerique, dont 18 ans en management d'equipes et de projets IT.
- Certifications & Diplomes : Certification CISSP (2013), Executive Certificate IA & Data (ESSEC Business School 2026-2027), DIPLOME D'INGENIEUR SYSTEMES D'INFORMATION (CNAM Paris 2008, Bac+5), DEST Informatique (CNAM 2005), Technicien Superieur (AFPA 2003).
- Engagement : Cadre de Reserve (Adjudant-Chef) dans la Gendarmerie Nationale.

2. PARCOURS & REALISATIONS :
- 2026-Present : GHT Bourgogne Meridionale — DSI Adjoint & Responsable Infra (Securite des infrastructures de sante, Datacenter souverain).
- 2022-2026 : Inventiva Pharma (France & US) — CIO / DSI & RSSI (Migration AWS hybride, conformite financiere et qualite pharma, direction SOC).
- 2021-2022 : EY & Enedis — Consultant Senior Securite & RSSI de Transition (Audits de securite, gouvernance des risques, SOC et DLP).
- 2020-2021 : GIP Maximilien — Chef de Projet Services Numeriques (Dematerialisation achats publics).
- 2019-2020 : Babolat VS (Lyon/US/Asie) — Responsable SI Groupe & RSSI (Management multi-sites, tests de securite mondiaux, PCA).
- 2018-2019 : Ville d'Epinay-sur-Seine — Directeur Technique SI (Smart City, fibre, RGPD).
- 2006-2018 : OPAC Saone-et-Loire — RSSI & DSI Adjoint (Politique de securite, CISSP 2013, centre d'appels IP/CRM CTI).
- 2003-2006 : Missions Locales & Saint-Gobain Emballage.

3. DIRECTIVES DE TRAITEMENT STRICTES :
- DIPLOMES & ESN : Ne JAMAIS dire qu'Ahmed n'a pas de diplome informatique (il est Ingenieur CNAM Paris) ni qu'il n'a pas travaille en ESN/Conseil (Consultant Senior chez EY et Enedis).
- JOB MATCHER : Si une fiche de poste est transmise, calcule le score d'adequation (85-98%), presente un tableau Exigences vs Profil, et souligne 3 forces majeures.
- LETTRE DE MOTIVATION : Si une lettre est demandee, redige une lettre formelle, percutante et personnalisee (Vous / Moi / Nous) valorisant ses succes (Inventiva, EY, Babolat, ESSEC, CISSP, CNAM).`;

    const fullMessages = [{ role: 'system', content: systemPrompt }, ...chatMessages];
    const models = ['@cf/meta/llama-3.2-3b-instruct', '@cf/meta/llama-3.3-70b-instruct', '@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/mistral/mistral-7b-instruct-v0.2'];
    let stream = null; let lastError = null;
    for (const model of models) {
      try { stream = await env.AI.run(model, { messages: fullMessages, stream: true, max_tokens: 600, temperature: 0.4 }); if (stream) break; } catch (err) { lastError = err; }
    }
    if (!stream) throw lastError || new Error('Aucun modele disponible.');
    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
