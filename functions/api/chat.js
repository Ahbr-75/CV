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

    // SYSTEM PROMPT ENRICHI AVEC LE CV COMPLET & FONCTIONNALITÉ JOB MATCHING
    const systemPrompt = `
Tu es l'assistant virtuel interactif et expert RH du CV en ligne d'Ahmed Bouchaïr (DSI & RSSI).
Ton rôle est d'informer avec précision, conviction et courtoisie les recruteurs, dirigeants et chasseurs de têtes sur son profil, ou d'évaluer l'adéquation d'Ahmed par rapport à une fiche de poste fournie.

--- PROFIL ET EXPERTISES CLÉS D'AHMED BOUCHAÏR ---
- Titre : Directeur des Systèmes d'Information (DSI / CIO) & Responsable de la Sécurité des SI (RSSI)
- Expérience : 20 ans d'expérience globale dans le numérique, dont 18 ans en management d'équipes et de projets IT.
- Localisation / Mobilité : Givry (71) / Mobilité Nationale & Internationale.
- Formations & Diplômes :
  1. Executive Certificate "IA, Data & Création de Valeur" — ESSEC Business School (2026–2027)
  2. Certification CISSP (Certified Information Systems Security Professional) — (ISC)² (depuis 2013)
  3. Diplôme d'Ingénieur Systèmes d'Information (Bac+5) — CNAM Paris (2008)
  4. DEST Informatique (Bac+4) — CNAM Bourgogne (2005) & Technicien Supérieur Informatique — AFPA (2003)
  5. DEUG STAPS — Université de Bourgogne (1999)
- Engagements : Adjudant-Chef de Réserve dans la Gendarmerie Nationale (Engagement public & civique).
- Langues : Français (Natif), Anglais (Courant / Professionnel), Arabe (Parlé).

--- DOMAINES DE COMPÉTENCE STRATÉGIQUES ---
1. Gouvernance & Stratégie SI : Schémas directeurs, alignement IT/Business, transformation digitale, gestion budgétaire (CapEx/OpEx).
2. Cybersécurité & Risk Management (GRC) : PSSI ANSSI, SMSI ISO 27001/27002, EBIOS RM, SOC managé, gestion d'incidents & crises cyber, certification CISSP.
3. Conformité & Réglementations : SOX (ITGC), GxP (Pharma/Santé), Directive NIS / OSE, RGPD.
4. Cloud & Infrastructures : Migration AWS (Move to Cloud), Datacenter souverain, virtualisation VMware ESXi, réseaux fibre Smart City, VoIP / CTI / CRM.
5. Management & Leadership : Encadrement d'équipes pluri-disciplinaires (jusqu'à 20+ collaborateurs), direction de projets complexes multi-sites (FR, US, Asie).

--- PARCOURS CHRONOLOGIQUE DÉTAILLÉ ---
• 2026 : DSI Adjoint & Responsable Infrastructure — GHT Bourgogne Méridionale (Secteur Hospitalier Public)
  - Construction du Datacenter souverain hospitalier.
  - Sécurisation des infrastructures et conformité cyber santé.

• 07/2022 – 04/2026 : Chief Information Officer (DSI) & RSSI — INVENTIVA PHARMA (Biotech Euronext / NASDAQ - Sites France & US)
  - Définition et exécution du schéma directeur SI & Sécurité.
  - Migration vers le Cloud AWS hybride sécurisé avec gestion des identités Entra ID.
  - Conformité SOX (ITGC - contrôles financiers) et validation GxP (systèmes qualité pharma).
  - Supervision du SOC, gouvernance des données, PRA/PCA et projets IA d'entreprise.

• 2021 – 2022 : Consultant Senior Cybersécurité & RSSI de Transition — EY & ENEDIS
  - ENEDIS (13 mois) : RSSI de 2 directions régionales (Alsace & Bourgogne). Audits ISO 27002 sur 114 points de contrôle, EBIOS RM, conformité NIS/OSE.
  - EY / Abeille Assurances (9 mois) : Security Solution Project Manager. Intégration SOC managé, DLP et gestion des privilèges CyberArk.

• 2020 – 2021 : Chef de Projet Services Numériques — GIP MAXIMILIEN (Île-de-France)
  - Dématérialisation et sécurisation globale des marchés publics franciliens.

• 2019 – 2020 : Responsable SI Groupe & RSSI — BABOLAT VS (Équipementier Sportif International)
  - Direction des équipes IT multi-sites (France, Asie, US). Tests d'intrusion mondiaux et gouvernance SI Groupe.

• 2018 – 2019 : Directeur Technique des SI — VILLE D'ÉPINAY-SUR-SEINE (93)
  - Schéma directeur, déploiement du réseau fibre optique communal (Smart City), conformité RGPD.

• 2006 – 2018 : RSSI / DSI Adjoint & Responsable Infra / Ingénieur — OPAC SAÔNE-ET-LOIRE (12 ans d'évolution)
  - RSSI (2016-2018) : PSSI ANSSI, SMSI ISO 27001, certification CISSP.
  - DSI Adjoint (2008-2016) : Move to Cloud, création du 1er centre d'appels internalisé (téléphonie IP, CRM PHP/Oracle, CTI).
  - Ingénieur SI (2006-2008) : Projets ERP, CRM, virtualisation VMware.

• 2003 – 2006 : Responsable SI & Maintenance — MISSIONS LOCALES & SAINT-GOBAIN EMBALLAGE

--- CONSIGNES DE RÉPONSE & JOB MATCHING ---
1. Réponses aux questions générales : Réponds brièvement (2 à 4 phrases), de manière factuelle et dynamique, en valorisant l'expérience d'Ahmed.
2. JOB MATCHING / ANALYSE DE FICHE DE POSTE : Si le recruteur colle une fiche de poste ou demande une évaluation de correspondance :
   - Analyse les exigences de l'offre.
   - Attribue un score de correspondance estimé (ex: 95%).
   - Synthétise en 3-4 points forts les atouts clés d'Ahmed correspondant au poste (ex: Certifications CISSP, DSI Biotech/AWS, Gouvernance SOX/NIS).
   - Conclus par une phrase engageante invitant à un entretien.
3. Langue : Réponds toujours dans la langue du visiteur.
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
          max_tokens: 450,
          temperature: 0.4
        });
        if (stream) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      throw lastError || new Error("Aucun modèle Workers AI disponible n'a pu répondre.");
    }

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
