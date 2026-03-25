/**
 * Vercel serverless function — OpenAI-compatible chat completions proxy.
 * Used by generateScenarioReport() in hr-demo.js.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages, max_tokens = 1024, temperature = 0.3 } = req.body;

    if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

    const system = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens,
                temperature,
                ...(system && { system }),
                messages: userMessages
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }

        const data = await response.json();
        const content = data.content?.[0]?.text ?? '';

        // Return OpenAI-compatible format
        return res.status(200).json({
            choices: [{ message: { role: 'assistant', content } }]
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
