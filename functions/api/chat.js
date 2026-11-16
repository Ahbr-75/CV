// functions/api/chat.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Vérification de la liaison Workers AI
    if (!env || !env.AI) {
      return new Response(
        JSON.stringify({ 
          error: "Binding AI non configuré", 
          details: "La variable env.AI est introuvable. Vérifiez la liaison Workers AI (nom: AI) sous Cloudflare Settings > Functions." 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const message = body.message;

    if (!message) {
      return new Response(JSON.stringify({ error: "Message vide" }), { status: 400 });
    }

    const systemPrompt = `
Tu es l'assistant virtuel interactif du CV en ligne d'Ahmed Bouchaïr (DSI & RSSI).
Ton rôle est d'informer les recruteurs et dirigeants sur son profil, ses compétences et ses réalisations avec précision et courtoisie.

--- PARCOURS ET EXPÉRIENCES ---
- Ahmed Bouchaïr: DSI & RSSI avec 20 ans d'expérience globale dans le numérique et 18 ans en management IT.
- Inventiva (2022-2026): DSI & RSSI, management IT (France, US, UK), migration AWS, SOC, SOX/GxP.
- EY / Enedis (2021-2022): Consultant Cybersécurité, EBIOS RM, ISO 27002, conformité NIS (OSE).
- Formations: Executive Certificate IA ESSEC (2026-2027), Certification CISSP, Ingénieur CNAM (2008).

Consignes: Réponds brièvement (2 à 4 phrases), dans la langue de la question. Ne fabrique aucune information.
`;

    // Modèle Llama 3.1 8B Instruct
    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: 0.5
    });

    const outputText = aiResponse.response || aiResponse.result || JSON.stringify(aiResponse);

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
