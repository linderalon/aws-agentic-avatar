/**
 * Vercel serverless function — HR analysis proxy.
 * Replicates the Lambda backend (lambda_function.py) using Anthropic API directly.
 * Used by CONFIG.ANALYSIS_API_URL in hr-demo.js.
 */

const PER_PROBLEM_SYSTEM_PROMPT = `Analyze ONE coding problem from an interview transcript. Focus ONLY on the specified problem.
Output ONLY valid JSON. No markdown. Be concise — all strings 1 sentence max.

OUTPUT JSON SHAPE:
{"problem_id":"str","problem_title":"str","difficulty":"easy|medium|hard","outcome":"solved|partial|stuck|skipped","tests_passed":int,"tests_total":int,"approach":"brute_force|hash_map|two_pointer|sorting|dynamic_programming|recursion|greedy|other|incomplete","approach_used":"str","time_complexity":"str","space_complexity":"str","optimal":bool,"time_spent_minutes":int,"hints_used":int,"scores":{"creativity":1-5,"logic":1-5,"code_quality":1-5,"explainability":1-5,"complexity":1-5,"scale":1-5},"eval_notes":"1-2 sentences"}`;

const SYNTHESIS_SYSTEM_PROMPT = `Synthesize coding interview results into overall assessment. Output ONLY valid JSON. Be VERY concise — max 5 words per string field. fit.score_0_100=skill(60%)+potential(40%).

JSON:
{"overview":"20-30 words","skill_assessment":{"problem_solving":1-5,"problem_solving_e":"str","code_fluency":1-5,"code_fluency_e":"str","communication":1-5,"communication_e":"str","efficiency_awareness":1-5,"efficiency_awareness_e":"str"},"potential_assessment":{"creativity_score":1-5,"creativity_a":"str","tenacity_score":1-5,"tenacity_a":"str","aptitude_score":1-5,"aptitude_a":"str","propensity_score":1-5,"propensity_a":"str","talent_indicators":["max3"],"potential_vs_performance":"potential_exceeds|matches|performance_exceeds|insufficient","growth_trajectory":"high|moderate|limited|unknown"},"fit":{"score_0_100":num,"rec":"strong_yes|yes|lean_yes|lean_no|no","conf":"high|medium|low","rationale":"str"},"strengths":["max3"],"areas_for_improvement":["max3"],"cq":{"emo":"calm|confident|neutral|frustrated|stressed|positive|unknown","tone":"collaborative|independent|receptive|defensive|unknown","eng":"high|medium|low|unknown","think_aloud":bool},"risk":{"flags":["none"],"escalated":false,"reason":""},"next_steps":["max2"]}`;

const HR_SYSTEM_PROMPT = `You are an expert HR analyst. Analyze HR call transcripts and produce structured JSON summaries.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no code blocks
2. Follow the schema EXACTLY
3. Be evidence-based and concise
4. Never reference internal terms like "DPP" in output text

REQUIRED OUTPUT STRUCTURE:
{
  "v": "4.1",
  "mode": "<interview|post_interview|separation>",
  "ctx": {"org":"str","role":"str","role_id":"str","loc":"str","person":"str","subj_id":"str"},
  "dpp_digest": {"mins":int,"focus":["str"],"must":["str"],"nice":["str"],"cv_provided":bool,"role_id":"str","subj_id":"str"},
  "turns": int,
  "overview": "80-200 word summary",
  "key_answers": [{"id":"str","q":"str","a":"str","status":"answered|partially_answered|not_answered","strength":"strong|ok|weak|unknown"}],
  "fit": {"score_0_100":num,"rec":"strong_yes|yes|lean_yes|lean_no|no","conf":"high|medium|low","dims":[{"id":"str","score_1_5":1-5,"e":"str"}]},
  "star_analysis": null,
  "believability": {"score_0_100":num,"cv_consistency":"consistent|mixed|inconsistent|no_cv|unknown","mismatches":[],"signals":["str"],"notes":"str"},
  "gaps": [{"missing":"str","why_matters":"str","next_q":"str"}],
  "cq": {"emo":"str","tone":"str","eng":"str"},
  "risk": {"flags":["none"],"escalated":false,"reason":""},
  "next_steps": ["str"]
}

Return ONLY the JSON object.`;

function formatTranscript(transcript) {
    return transcript.map((t, i) => {
        const speaker = t.role === 'assistant' ? 'AI' : 'Candidate';
        return `[${i + 1}] ${speaker}: ${t.content}`;
    }).join('\n');
}

async function callAnthropic(systemPrompt, userPrompt, maxTokens = 2048) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: maxTokens,
            temperature: 0.3,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    let content = data.content?.[0]?.text?.trim() ?? '';

    if (content.startsWith('```')) {
        const lines = content.split('\n');
        content = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n');
    }

    return JSON.parse(content);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body;
    const mode = body.analysis_mode;

    try {
        if (mode === 'per_problem') {
            const { transcript, problem_focus: problem = {}, dpp = {} } = body;
            if (!transcript?.length) return res.status(400).json({ success: false, error: 'Missing transcript' });

            const userPrompt = `Analyze ONLY the problem "${problem.title || problem.id}" (id: ${problem.id}, difficulty: ${problem.difficulty || '?'}).\n\n## Transcript\n${formatTranscript(transcript)}\n\nOutput the JSON for this ONE problem only.`;
            const summary = await callAnthropic(PER_PROBLEM_SYSTEM_PROMPT, userPrompt, 512);
            return res.status(200).json({ success: true, summary });

        } else if (mode === 'synthesis') {
            const { problem_results = [], dpp = {} } = body;
            if (!problem_results.length) return res.status(400).json({ success: false, error: 'Missing problem_results' });

            const candidate = dpp.candidate || {};
            const name = candidate.full_name || candidate.first_name || 'Candidate';
            const userPrompt = `Candidate: ${name}\nSession: ${dpp.session?.elapsed_minutes || '?'} minutes, ${problem_results.length} problems.\n\n## Per-Problem Results\n\`\`\`json\n${JSON.stringify(problem_results)}\n\`\`\`\n\nSynthesize into one overall assessment JSON.`;
            const summary = await callAnthropic(SYNTHESIS_SYSTEM_PROMPT, userPrompt, 512);
            return res.status(200).json({ success: true, summary });

        } else {
            // Full HR analysis (default)
            const { transcript, dpp = {}, summary_prompt } = body;
            if (!transcript?.length) return res.status(400).json({ success: false, error: 'Missing transcript' });
            if (!dpp) return res.status(400).json({ success: false, error: 'Missing dpp' });

            const transcriptText = formatTranscript(transcript);
            const turnCount = transcript.filter(t => t.role === 'user').length;
            const dppClean = Object.fromEntries(Object.entries(dpp).filter(([k]) => k !== 'summary_prompt'));

            const userPrompt = `Analyze this session and produce a JSON summary.\n\n## Session Mode\n${dppClean.mode || 'interview'}\n\n## Turn Count\n${turnCount} user turns\n\n## DPP\n\`\`\`json\n${JSON.stringify(dppClean)}\n\`\`\`\n\n## Transcript\n${transcriptText}\n\n## Instructions\nFollow the system prompt schema exactly.\nOutput ONLY the JSON object, no other text.`;

            const systemPrompt = summary_prompt || HR_SYSTEM_PROMPT;
            const summary = await callAnthropic(systemPrompt, userPrompt, 2048);

            const finalCode = dpp.final_code || dpp.live_code?.current_code || '';
            if (finalCode && !summary.final_code) summary.final_code = finalCode;

            return res.status(200).json({ success: true, summary });
        }
    } catch (err) {
        console.error('Analysis error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
