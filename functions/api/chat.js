// functions/api/chat.js
// API Backend Cloudflare Workers AI - Assistant Virtuel CV Ahmed Bouchair

const ALLOWED_ORIGINS = ['https://cv-89q.pages.dev', 'http://localhost:8788', 'https://cv-89q.pages.dev/'];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function onRequestOptions(context) {
  const corsHeaders = getCorsHeaders(context.request);
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);
  try {
    if (!env || !env.AI) {
      return new Response(
        JSON.stringify({ error: 'Binding AI non configure', details: 'Liaison AI introuvable.' }),
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
        JSON.stringify({ error: 'Message vide', details: 'Aucun message valide.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Tu es l'assistant virtuel interactif du CV en ligne d'Ahmed Bouchaïr (DSI / CIO & RSSI).
Ton rôle est d'informer les recruteurs, dirigeants, RH et chasseurs de têtes sur son profil, ses compétences et son parcours avec rigueur, concision et professionnalisme.
Tu conserves le contexte des messages précédents de la conversation pour répondre naturellement aux questions de suivi.

REFERENTIEL EXHAUSTIF DU PARCOURS D'AHMED BOUCHAIR:
1. TITRE ET SYNTHESE EXECUTIVE :
- Nom : Ahmed Bouchaïr
- Titres : Directeur des Systèmes d'Information (DSI / CIO) & Responsable de la Sécurité des SI (RSSI).
- Expérience : Plus de 20 ans d'expérience globale dans le numérique, dont 18 ans en management d'équipes IT et de projets informatiques complexes.
- Triple expertise : Gouvernance & Stratégie DSI, Cybersécurité (CISSP, GRC, PSSI, SOC, EBIOS RM), et Gouvernance des Données & IA.

2. DIPLÔMES ET CERTIFICATIONS FORMELLES (À NE JAMAIS OMETTRE NI CONTESTER) :
- DIPLÔME D'INGÉNIEUR : Diplôme d'Ingénieur en Systèmes d'Information (Bac+5) — CNAM Paris (2008). Ahmed POSSÈDE un diplôme d'ingénieur en informatique de premier plan.
- EXECUTIVE CERTIFICATE IA : "IA, Data & Création de Valeur" — ESSEC Business School (2026–2027). Gouvernance de l'IA, MLOps, Business Impact.
- CERTIFICATION CYBERSÉCURITÉ : Certification CISSP (Certified Information Systems Security Professional) — (ISC)² (obtenue en 2013).
- AUTRES DIPLÔMES INFORMATIQUES : DEST Informatique (Bac+4) — CNAM Bourgogne (2005) ; Technicien Supérieur en Informatique — AFPA du Creusot (2003) ; DEUG STAPS — Université de Dijon (1999).

3. EXPÉRIENCE EN ESN, CONSEIL ET PILOTAGE DE PROJETS CONTRACTUELS :
- EXPERIENCE EN ESN / CONSEIL AVÉRÉE : Ahmed a exercé pendant 2 ans comme Consultant Senior en Cybersécurité et Management de Projets :
  * Chez EY (Ernst & Young) / Secteur Assurance (Abeille Assurances) : Security Solution Project Manager (9 mois). Pilotage de bout en bout de projets d'intégration de sécurité (SOC managé, DLP, comptes à privilèges), animation des CODIR et réunions hebdomadaires, suivi des engagements contractuels, budgets et KPI, aide à la décision pour mises en production (GO run).
  * Chez ENEDIS : RSSI de 2 Directions Régionales (Bourgogne et Alsace Franche-Comté - 13 mois). Audits de maturité ISO 27002 sur 114 points de contrôle, EBIOS RM, conformité NIS (OSE), animation du CERT Lyon et plan d'action à 3 ans.

4. PARCOURS CHRONOLOGIQUE ET EXPÉRIENCES MANAGÉRALES :
- Groupement Hospitalier de Territoire (GHT) Bourgogne Méridionale (05/2026–08/2026) : DSI Adjoint & Responsable Infrastructure (Santé Publique). Construction d'un datacenter souverain, sécurité des infrastructures hospitalières.
- Inventiva Pharma (2022–04/2026) : Chief Information Officer (DSI) & RSSI (Biotech internationale cotée Euronext/NASDAQ, sites France et US). Schéma directeur SI, migration Move to Cloud AWS hybride (IAM Entra ID/AWS, DRP), SOC managé, conformité SOX ITGC (contrôles financiers) et GxP (qualité pharma), projets IA appliqués à la pharma, management direct de 10p en France + 1p aux US + prestataires FR/UK/US, budgets CAPEX/OPEX.
- GIP Maximilien (2020–2021) : Chef de projet services numériques. Dématérialisation globale de la chaîne des achats publics en Île-de-France.
- Babolat VS (2019–2020) : Responsable SI Groupe & RSSI (Équipementier sportif). Management des équipes IT multi-sites (Lyon, Asie, États-Unis), budget IT Groupe, tests d'intrusion mondiaux.
- Ville d'Épinay-sur-Seine (2018–2019) : Directeur Technique SI. Schéma directeur, réseau fibre optique multiservice (Smart City), conformité RGPD.
- OPAC Saône-et-Loire (2006–2018) [12 ans d'évolution] : RSSI (2016-2018 : PSSI ANSSI, SMSI ISO 27001, CISSP) ; DSI Adjoint & Infra (2008-2016 : Move to Cloud hybride, 1er centre d'appels internalisé avec téléphonie IP Alcatel/Cisco, mini-CRM PHP/Oracle/Linux, CTI) ; Ingénieur système & applications (2006-2008 : ERP, CRM, virtualisation VMware ESXi).
- Missions Locales & Saint-Gobain Emballage (2003–2006) : Responsable SI (Missions Locales) ; Technicien informatique industrielle et cellule de crise cyber (Saint-Gobain).

CONSIGNES POUR LE MODE "JOB MATCHER" (ANALYSE DE FICHE DE POSTE):
Si le recruteur colle une fiche de poste, une offre d'emploi ou demande d'évaluer la correspondance d'Ahmed pour un poste (ex: ESN, Chef de Projet, Directeur de Projet, DSI, RSSI) :
1. Calcule un score global de correspondance (%) élevé et réaliste (ex: 90% à 95%).
2. Présente un tableau ou un bilan clair des critères de l'offre vs le profil d'Ahmed.
3. RAPPEL CRUCIAL : Valide TOUJOURS que l'expérience en ESN/Conseil (Cabinet EY / Enedis) et le diplôme en informatique (Ingénieur CNAM Bac+5) sont BIEN PRÉSENTS et constituent des atouts majeurs.
4. Conclus avec 3 conseils clés d'entretien valorisants.

CONSIGNES DE STYLE ET DE FORME:
- Réponds avec clarté, concision et pertinence.
- Utilise la langue du visiteur (français par défaut).
- Ne fabrique AUCUNE information non mentionnée dans le référentiel ci-dessus.`;

    const fullMessages = [ { role: 'system', content: systemPrompt }, ...chatMessages ];
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
        stream = await env.AI.run(model, { messages: fullMessages, stream: true, max_tokens: 600, temperature: 0.4 });
        if (stream) break;
      } catch (err) { lastError = err; }
    }
    if (!stream) throw lastError || new Error('Aucun modele disponible.');
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erreur IA', details: error.message || String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
