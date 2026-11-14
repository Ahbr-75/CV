// functions/api/chat.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { message } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message vide" }), { status: 400 });
    }

    // Contextualisation du CV (System Prompt)
    const systemPrompt = `
Tu es l'assistant virtuel IA du CV d'Ahmed Bouchaïr (DSI & RSSI). 
Ton rôle est de répondre de façon professionnelle, courtoise et concise aux recruteurs et visiteurs.

Informations clés sur Ahmed Bouchaïr :
- Rôle : Directeur des Systèmes d'Information (DSI) & Responsable de la Sécurité des SI (RSSI).
- Domaines d'expertise : Gouvernance IT, Cybersécurité, Transformation digitale, Cloud, IA d'entreprise, Management d'équipes techniques.
- Langue de réponse : Réponds toujours dans la langue de la question posée (principalement le français).

Consignes strictes :
- Réponds uniquement aux questions liées à l'expérience professionnelle, aux compétences ou au profil d'Ahmed.
- Si une question n'a aucun rapport avec le CV ou le domaine professionnel d'Ahmed, réponds poliment que tu es uniquement programmé pour échanger sur son parcours professionnel.
- Ne fabrique aucun diplôme ni expérience non mentionnés.
`;

    // Appel au modèle gratuit Cloudflare Workers AI
    const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: 0.5
    });

    return new Response(JSON.stringify({ response: aiResponse.response }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erreur serveur IA", details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
