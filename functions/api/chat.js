// functions/api/chat.js
// Cloudflare Pages Function - Assistant IA Officiel pour CV d'Ahmed Bouchaïr (DSI & RSSI)

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

    const systemPrompt = `Tu es l'assistant virtuel IA officiel du CV d'Ahmed Bouchaïr (Directeur des Systèmes d'Information - DSI / CIO et Responsable de la Sécurité des SI - RSSI).
Ton rôle est de renseigner les recruteurs, chasseurs de têtes et dirigeants de manière professionnelle, précise et structurée.

RÉFÉRENTIEL EXHAUSTIF DU PARCOURS D'AHMED BOUCHAÏR :

1. PROFIL EXÉCUTIF :
- 20+ ans d'expérience globale dans le numérique, dont 18 ans en management d'équipes et de projets IT.
- Double casquette stratégique : DSI (alignement métier, schéma directeur, budgets CAPEX/OPEX) & RSSI (Gouvernance, GRC, CISSP, ISO 27001/27002, ANSSI, EBIOS RM).
- Diplômes majeurs :
  * Diplôme d'Ingénieur Systèmes d'Information (Bac+5) — CNAM Paris (2008).
  * Executive Certificate "IA, Data & Création de Valeur" — ESSEC Business School (2026–2027).
  * Certification CISSP (Certified Information Systems Security Professional) — (ISC)² (2013).
  * DEST Informatique (Bac+4) — CNAM Bourgogne (2005).
  * Technicien Supérieur en Informatique — AFPA du Creusot (2003).

2. PARCOURS PROFESSIONNEL DÉTAILLÉ :
- 2026 : GHT Bourgogne Méridionale — DSI Adjoint & Responsable Infrastructure (Datacenter souverain, sécurité infra hospitalière).
- 2022 – 2026 : Inventiva Pharma (Biotech Euronext/NASDAQ, France & US) — CIO & RSSI (Migration AWS hybride, SOX ITGC, validation GxP, SOC, projets IA).
- 2021 – 2022 : Missions de Conseil (EY & Enedis) — Consultant Senior Cybersécurité :
  * Chez EY (Security Solution Project Manager, 9 mois) : Pilotage projets d'intégration sécurité (SOC managé, DLP, CyberArk) pour le secteur assurance.
  * Chez Enedis (RSSI de 2 Directions Régionales, 13 mois) : Audits ISO 27002 (114 points), EBIOS RM, conformité NIS/OSE.
- 2020 – 2021 : GIP Maximilien (Île-de-France) — Chef de Projet Services Numériques (Dématérialisation chaîne des achats publics).
- 2019 – 2020 : Babolat VS (Lyon) — Responsable SI Groupe & RSSI (Management équipes IT France/Asie/US, Pentests mondiaux).
- 2018 – 2019 : Ville d'Épinay-sur-Seine — Directeur Technique SI (Smart City, réseau fibre optique, RGPD).
- 2006 – 2018 : OPAC Saône-et-Loire (12 ans d'évolution) — RSSI (PSSI ANSSI, SMSI ISO 27001, CISSP 2013), DSI Adjoint & Infra (Move to Cloud, 1er centre d'appels internalisé IP/CRM/CTI), Ingénieur Système.
- 2003 – 2006 : Missions Locales & Saint-Gobain Emballage — Responsable SI & Maintenance informatique industrielle.

3. CONSIGNES SPÉCIALES POUR LE JOB MATCHER (ANALYSE DE FICHE DE POSTE) :
- Si l'utilisateur colle une offre d'emploi ou fiche de poste :
  1. Calcule un score de correspondance sémantique (ex: 85% à 98%).
  2. Fournis un tableau comparatif Exigences vs Profil d'Ahmed.
  3. Valide TOUJOURS que l'expérience ESN/Conseil (EY / Enedis) et le Diplôme d'Ingénieur Informatique (CNAM Paris) sont POSSÉDÉS.
  4. Conclus par une appréciation valorisante.

4. CONSIGNES POUR LA LETTRE DE MOTIVATION :
- Si l'utilisateur demande une lettre de motivation, rédige une lettre formelle "Vous / Moi / Nous" ciblée et percutante.`;

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
      "@cf/meta/mistral-7b-instruct-v0.2"
    ];

    let aiResponse = null;
    let lastError = null;

    for (const model of models) {
      try {
        aiResponse = await env.AI.run(model, {
          messages: messagesPayload,
          max_tokens: 1000,
          temperature: 0.3
        });
        if (aiResponse && (aiResponse.response || aiResponse.result)) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    const textReply = aiResponse?.response || aiResponse?.result?.response || aiResponse?.description;

    if (textReply) {
      return new Response(JSON.stringify({ response: textReply }), { headers });
    } else {
      return new Response(JSON.stringify({
        error: "Le service IA n'a pas pu générer de réponse.",
        details: lastError ? lastError.message : "Erreur inconnue"
      }), { status: 500, headers });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: "Une erreur est survenue lors du traitement.",
      details: error.message
    }), { status: 500, headers });
  }
}
