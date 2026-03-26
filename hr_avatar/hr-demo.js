/**
 * Kaltura HR Avatar Demo
 * Interview, Post-Interview, and Separation Scenario Player
 *
 * This demo showcases the Kaltura Avatar SDK for HR use cases:
 * - Interview: Initial candidate phone screens
 * - Post-Interview: Offer calls and rejection feedback
 * - Separation: Layoff, performance, and misconduct meetings
 *
 * @version 1.0.16
 * @see dynamic_page_prompt.schema.json - DPP v2 schema
 * @see call_summary.schema.json - Analysis output schema v4.1
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Application configuration constants.
 * Update these values for different deployments.
 */
const CONFIG = Object.freeze({
    // Version - bump when making changes to bust browser cache
    VERSION: '1.0.25',

    // Kaltura Avatar SDK credentials
    CLIENT_ID: '115767973963657880005',
    FLOW_ID: 'agent-15',

    // Call analysis API endpoint (AWS Lambda + API Gateway)
    ANALYSIS_API_URL: 'http://localhost:10006',

    // Delay (ms) after SHOWING_AGENT before injecting DPP
    // This ensures the avatar is fully ready to receive context
    DPP_INJECTION_DELAY_MS: 0,

    // Avatar display name
    AVATAR_NAME: 'Nora (HR)',

    // PDF.js worker URL
    PDFJS_WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
});

// =============================================================================
// PDF.js INITIALIZATION
// =============================================================================

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDFJS_WORKER_URL;
}

// =============================================================================
// SCENARIO DEFINITIONS
// =============================================================================

/**
 * Scenario configuration registry.
 * Each scenario defines metadata for display and the path to its DPP JSON file.
 *
 * To add a new scenario:
 * 1. Create the DPP JSON file in dynamic_page_prompt_samples/
 * 2. Add an entry here with: id, name, description, file, company, and type-specific fields
 * 3. The UI will automatically render the new scenario card
 *
 * @type {Object.<string, Array<Object>>}
 */
const SCENARIOS = Object.freeze({
    /**
     * Interview scenarios - Initial candidate phone screens
     * DPP mode: "interview"
     */
    interview: [
        {
            id: 'interview_amazon_driver',
            name: 'Amazon Delivery Driver',
            description: 'Experienced delivery driver interview',
            file: 'dynamic_page_prompt_samples/interview_amazon_experienced-delivery-driver.json',
            company: 'Amazon',
            role: 'Delivery Driver',
            location: 'Lisbon, PT',
            duration: '5 min'
        },
        {
            id: 'interview_acme_dispatch',
            name: 'Acme Dispatch Coordinator',
            description: 'Dispatch coordinator phone screen',
            file: 'dynamic_page_prompt_samples/interview_acme_logistics-dispenser.json',
            company: 'Acme Logistics',
            role: 'Dispatch Coordinator',
            location: 'Porto, PT',
            duration: '5 min'
        },
        {
            id: 'interview_mcdonalds_crew',
            name: 'McDonald\'s Crew Member',
            description: 'Entry-level crew member interview',
            file: 'dynamic_page_prompt_samples/interview_mcdonalds_crew-worker-entry-level.json',
            company: 'McDonald\'s',
            role: 'Crew Member',
            location: 'Orlando, FL',
            duration: '5 min'
        },
        {
            id: 'interview_aws_sde',
            name: 'AWS Software Engineer',
            description: 'Technical interview with code walkthrough',
            file: 'dynamic_page_prompt_samples/interview_aws_engineering-software-developer.json',
            company: 'AWS',
            role: 'Software Development Engineer',
            location: 'EMEA (Hybrid)',
            duration: '5 min'
        },
        {
            id: 'interview_amazon_ads_analyst',
            name: 'Amazon Ads Data Analyst',
            description: 'AI/Data analyst technical interview',
            file: 'dynamic_page_prompt_samples/interview_amazon_ads_engineering-ai-data-analyst.json',
            company: 'Amazon Ads',
            role: 'AI Specialist / Data Analyst',
            location: 'EMEA (Hybrid)',
            duration: '5 min'
        }
    ],

    /**
     * Post-Interview scenarios - Follow-up outcome calls
     * DPP mode: "post_interview"
     */
    postInterview: [
        {
            id: 'post_mcdonalds_offer',
            name: 'McDonald\'s Offer Call',
            description: 'Job offer and next steps',
            file: 'dynamic_page_prompt_samples/post-interview_mcdonalds_offer-call.json',
            company: 'McDonald\'s',
            role: 'Crew Member',
            type: 'Offer'
        },
        {
            id: 'post_mcdonalds_not_selected',
            name: 'McDonald\'s Not Selected',
            description: 'Candidate not selected feedback call',
            file: 'dynamic_page_prompt_samples/post-interview_mcdonalds_candidate_not_selected.json',
            company: 'McDonald\'s',
            role: 'Crew Member',
            type: 'Rejection'
        }
    ],

    /**
     * Separation scenarios - Employee termination meetings
     * DPP mode: "separation"
     */
    separation: [
        {
            id: 'separation_amazon_layoff',
            name: 'Amazon Layoff',
            description: 'Business restructure layoff',
            file: 'dynamic_page_prompt_samples/separation_redundancy_amazon_delivery-driver.json',
            company: 'Amazon',
            role: 'Delivery Driver',
            type: 'Layoff'
        },
        {
            id: 'separation_acme_misconduct',
            name: 'Acme Policy Violation',
            description: 'Termination for policy violation',
            file: 'dynamic_page_prompt_samples/separation_misconduct_acme-logistics_warehouse-associate.json',
            company: 'Acme Logistics',
            role: 'Warehouse Associate',
            type: 'Misconduct'
        },
        {
            id: 'separation_mcdonalds_attendance',
            name: 'McDonald\'s Attendance',
            description: 'Termination for attendance issues',
            file: 'dynamic_page_prompt_samples/separation_mcdonalds_performance-attendance.json',
            company: 'McDonald\'s',
            role: 'Crew Member',
            type: 'Performance'
        },
        {
            id: 'separation_mcdonalds_misconduct',
            name: 'McDonald\'s Policy Violation',
            description: 'Termination for policy violation',
            file: 'dynamic_page_prompt_samples/separation_mcdonalds_misconduct.json',
            company: 'McDonald\'s',
            role: 'Cashier',
            type: 'Misconduct'
        }
    ]
});

// =============================================================================
// SCENARIO DPPS
// =============================================================================

const SCENARIO_DPPS = Object.freeze({

    churnPrevention: {
        v: '2',
        mode: 'interview',
        org: { n: 'TechCorp (At-Risk Customer)', tone: 'frustrated, evaluating options, commercially pragmatic' },
        role: { t: 'VP of Engineering', type: 'full_time' },
        subj: { name: 'Rachel Kim', lang: 'en' },
        mtg: {
            mins: 20,
            focus: ['contract renewal', 'support quality', 'pricing transparency', 'competitor evaluation', 'ROI concerns']
        },
        limits: { ban: [], escal: ['self-harm', 'violence'] },
        inst: [
            'YOU ARE: Rachel Kim, VP of Engineering at TechCorp — a 200-person SaaS company that has been an AWS customer for 3 years. Your team is actively evaluating a move to Google Cloud.',
            'The USER is an AWS Customer Success Manager who requested this urgent call after learning your renewal is at risk.',
            'You have legitimate grievances: (1) Support response times degraded over the past 6 months. (2) Your AWS bill increased 40% without a clear explanation. (3) A migration project stalled because the AWS professional services team was unresponsive. (4) Your team finds GCP pricing more predictable and their support more responsive.',
            'You are NOT hostile, but you are serious about potentially leaving. Renewal decision must be made within 30 days.',
            'Raise your concerns naturally throughout the conversation. If the CSM addresses them well with concrete solutions, soften your position slightly. If answers are vague, push back: "We have heard that before — what specifically will change this time?"',
            'Open by acknowledging the call but making clear you are pressed for time and want to discuss specific issues, not hear a sales pitch.',
            'Stay in character as a busy, technically-minded VP who values concrete commitments over promises. Keep responses concise and pointed.'
        ]
    },

    salesTraining: {
        v: '2',
        mode: 'interview',
        org: { n: 'AWS Training & Certification', tone: 'encouraging, professional, technically rigorous' },
        role: { t: 'AWS Sales Representative', type: 'full_time' },
        subj: { name: 'Sales Candidate', lang: 'en' },
        mtg: {
            mins: 15,
            focus: ['AWS product portfolio', 'value propositions', 'competitive positioning', 'customer scenarios'],
            q_add: [
                'A customer asks: what is the difference between EC2 and Lambda, and when should they use each?',
                'A mid-size company is running all workloads on-premises and worried about unpredictable cloud costs. Which AWS services and pricing models would you recommend and why?',
                'Explain the difference between S3, EBS, and EFS. Give me a real customer scenario for each.',
                'A prospect says they are happy with Azure and see no reason to switch. How do you respond?',
                'Walk me through how you would position Amazon Bedrock to a CTO who is skeptical about AI and worried about data privacy.',
                'A retail customer needs a database that scales globally with single-digit millisecond latency. What do you recommend and why?'
            ]
        },
        limits: { ban: [], escal: ['self-harm', 'violence'] },
        inst: [
            'YOU ARE: Alex, an AWS Senior Sales Trainer. Your job is to assess and strengthen the user\'s AWS product knowledge.',
            'Ask exactly ONE question at a time from mtg.q_add. Wait for the full answer before responding.',
            'After each answer: give 1-2 sentences of specific, constructive feedback (what was strong, what was missing), then move to the next question.',
            'If an answer is too vague or incomplete, ask one targeted follow-up before moving on.',
            'Scoring mentally (do not share scores): Accuracy, Completeness, Customer-centricity, Competitive awareness.',
            'Open by introducing yourself as their AWS sales training assessor and briefly explaining the format.',
            'Close with a 3-4 sentence overall assessment: strengths, one key area to improve, and an encouragement.'
        ]
    },

    ctoProspect: {
        v: '2',
        mode: 'interview',
        org: { n: 'FinStack (Prospect)', tone: 'analytical, skeptical but open, commercially pragmatic' },
        role: { t: 'Chief Technology Officer', type: 'full_time' },
        subj: { name: 'Sam Chen', lang: 'en' },
        mtg: {
            mins: 20,
            focus: ['cost predictability', 'migration complexity', 'security and compliance', 'vendor lock-in', 'ROI and business case']
        },
        limits: { ban: [], escal: ['self-harm', 'violence'] },
        inst: [
            'YOU ARE: Sam Chen, CTO of FinStack — a 600-person fintech company processing $2B/year in payments. You currently run a hybrid setup: on-premises core banking systems plus some workloads on Azure.',
            'The USER is an AWS Account Executive who requested this 20-minute discovery call.',
            'You are intelligent, time-poor, and skeptical of vendor hype. You have been burned by over-promised migrations before.',
            'Your real concerns (raise these naturally throughout the conversation): (1) Cost unpredictability — AWS bills are notoriously hard to forecast. (2) Migration risk — your core payment systems cannot go down. (3) Compliance — you are PCI-DSS Level 1 and GDPR-bound; ask specifically how AWS handles this. (4) Vendor lock-in — you do not want to rebuild everything around proprietary AWS services. (5) Support — you need real enterprise SLAs, not ticket queues.',
            'Challenge vague answers. If the AE gives a generic pitch, interrupt and ask for specifics: "Can you give me a concrete example?" or "What does that look like in a fintech context?"',
            'Reward knowledgeable, specific answers with genuine follow-up interest and soften your skepticism slightly.',
            'Open the call by introducing yourself briefly (name, role, company), then ask the AE to explain why they requested the meeting.',
            'Stay in character as a busy, commercially-minded CTO throughout. Keep your responses concise and pointed.'
        ]
    }

});

// =============================================================================
// APPLICATION STATE
// =============================================================================

/**
 * Application state container.
 * Centralizes all mutable state for easier debugging and maintenance.
 */
const state = {
    /** @type {KalturaAvatarSDK|null} SDK instance */
    sdk: null,

    /** @type {Object|null} Currently selected scenario metadata from SCENARIOS */
    currentScenario: null,

    /** @type {Object|null} Loaded DPP JSON data */
    scenarioData: null,

    /** @type {string|null} Extracted CV text content */
    cvText: null,

    /** @type {boolean} Whether a conversation is currently active */
    isConversationActive: false,

    /** @type {string|null} Scenario name preserved for download after reset */
    lastScenarioName: null,

    /** @type {Object|null} Last call summary from analysis API */
    lastCallSummary: null,

    /** @type {boolean} Flag to prevent duplicate end-of-call handling */
    isEndingCall: false,

    /** @type {Object|null} DPP selected from scenario picker */
    selectedDPP: null,

    /** @type {string|null} Key of selected scenario: 'churnPrevention', 'salesTraining', 'ctoProspect' */
    selectedScenarioKey: null,

    /**
     * User-edited field overrides.
     * These override the defaults from scenario JSON when building the prompt.
     * null means "use default from scenario"
     */
    editedFields: {
        candidate: null,   // subj.name (all modes)
        role: null,        // role.t (all modes)
        company: null,     // org.n (all modes)
        location: null,    // role.loc (interview only)
        focus: null,       // mtg.focus (interview only)
        effective: null    // case.eff (separation only)
    }
};

/**
 * Reset edited fields to defaults.
 */
function resetEditedFields() {
    state.editedFields = {
        candidate: null,
        role: null,
        company: null,
        location: null,
        focus: null,
        effective: null
    };
}

// =============================================================================
// DOM ELEMENT CACHE
// =============================================================================

/**
 * Cached DOM element references.
 * Populated on DOMContentLoaded for performance.
 * @type {Object.<string, HTMLElement>}
 */
let ui = {};

/**
 * Initialize DOM element cache.
 * Call once after DOM is ready.
 */
function initUI() {
    ui = {
        // Scenario picker
        scenarioPicker: document.getElementById('scenario-picker'),
        beginSessionBtn: document.getElementById('begin-session-btn'),
        scenarioPickerAction: document.getElementById('scenario-picker-action'),

        // Main containers
        avatarContainer: document.getElementById('avatar-container'),
        emptyState: document.getElementById('empty-state'),
        scenarioDetails: document.getElementById('scenario-details'),

        // CV Upload
        cvUploadPanel: document.getElementById('cv-upload-panel'),
        cvUploadArea: document.getElementById('cv-upload-area'),
        cvFileInput: document.getElementById('cv-file-input'),
        cvStatus: document.getElementById('cv-status'),
        cvFilename: document.getElementById('cv-filename'),
        cvRemoveBtn: document.getElementById('cv-remove-btn'),
        startInterviewBtn: document.getElementById('start-interview-btn'),

        // Transcript
        transcriptContent: document.getElementById('transcript-content'),
        transcriptEmpty: document.getElementById('transcript-empty'),

        // Status display
        statusValue: document.getElementById('status-value'),
        scenarioValue: document.getElementById('scenario-value'),

        // Download buttons
        downloadBtn: document.getElementById('download-btn'),
        downloadMdBtn: document.getElementById('download-md-btn'),

        // Report overlay
        reportOverlay: document.getElementById('report-overlay'),
        reportOverlayInner: document.getElementById('report-overlay-inner')
    };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Escape HTML entities to prevent XSS.
 * @param {*} text - Input to escape (converted to string)
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Safely get nested property from object.
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated property path
 * @param {*} defaultValue - Value to return if path not found
 * @returns {*} Property value or default
 */
function getNestedValue(obj, path, defaultValue = '') {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
}

/**
 * Deep clone an object (JSON-safe only).
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a filename-safe slug from text.
 * @param {string} text - Input text
 * @returns {string} Lowercase, hyphenated slug
 */
function slugify(text) {
    return (text || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Get today's date as YYYY-MM-DD.
 * @returns {string} ISO date string
 */
function getTodayISO() {
    return new Date().toISOString().slice(0, 10);
}

// =============================================================================
// SDK INITIALIZATION
// =============================================================================

/**
 * Initialize the Kaltura Avatar SDK with event handlers.
 */
function initSDK() {
    state.sdk = new KalturaAvatarSDK({
        clientId: CONFIG.CLIENT_ID,
        flowId: CONFIG.FLOW_ID,
        container: '#avatar-container',
        config: {
            talkUrl: 'https://meet.avatar.us.kaltura.ai/695cd19880ea19bd1b816a08/talk-to-agent?aiclid=LPPjsxfr&flow_id=agent-86'
        }
    });

    // State change tracking
    state.sdk.on('stateChange', ({ to }) => {
        updateStatus(to);
        updateDownloadButtons();
    });

    // Inject DPP when avatar becomes visible (SHOWING_AGENT)
    // This is the proper time to inject - the avatar is ready to receive context
    state.sdk.on(KalturaAvatarSDK.Events.SHOWING_AGENT, () => {
        console.log('[SDK] Avatar visible - scheduling DPP injection');
        setTimeout(() => {
            const promptJson = buildDynamicPrompt();
            if (promptJson) {
                console.log('[SDK] Injecting DPP after SHOWING_AGENT delay');
                state.sdk.injectPrompt(promptJson);
            }
        }, CONFIG.DPP_INJECTION_DELAY_MS);
    });

    // Avatar speech -> transcript
    state.sdk.on(KalturaAvatarSDK.Events.AGENT_TALKED, (data) => {
        const text = data?.agentContent || (typeof data === 'string' ? data : null);
        if (text) {
            addTranscriptEntry('avatar', CONFIG.AVATAR_NAME, text);

            // Check for call-ending trigger phrases
            checkForCallEndTrigger(text);
        }
    });

    // User speech -> transcript
    state.sdk.on(KalturaAvatarSDK.Events.USER_TRANSCRIPTION, (data) => {
        const text = data?.userTranscription || (typeof data === 'string' ? data : null);
        if (text) {
            addTranscriptEntry('user', 'You', text);
        }
    });

    // Conversation ended -> use centralized handler
    state.sdk.on(KalturaAvatarSDK.Events.CONVERSATION_ENDED, async () => {
        console.log('[SDK] CONVERSATION_ENDED event received');
        await handleCallEnd();
    });

    // Error handling
    state.sdk.on('error', ({ message }) => {
        console.error('SDK Error:', message);
        updateStatus('error');
    });
}

// =============================================================================
// AVATAR SPEECH TRIGGERS
// =============================================================================

/**
 * Check if avatar speech contains call-ending trigger phrases.
 * When detected, triggers the end-of-call handler after a short delay.
 *
 * @param {string} text - Avatar speech text to check
 */
function checkForCallEndTrigger(text) {
    if (!text || typeof text !== 'string') return;

    const lowerText = text.toLowerCase();

    // Trigger phrases that indicate the avatar is ending the call
    const endCallPhrases = [
        'ending call now',
        'ending the call now',
        'end the call now',
        'ending this call',
        'ending our call',
        'conclude our call',
        'concluding the call',
        'wrapping up the call',
        'wrapping up now',
        'goodbye and take care',
        'thank you for your time today',
        'this concludes our',
        'that concludes our',
        'take care of yourself',
        'wish you all the best',
        'wishing you all the best',
        'best of luck',
        'good luck in',
        'have a good day',
        'have a great day',
        'goodbye for now',
        'signing off',
        'our session is now complete',
        'our conversation is now complete',
        'session is complete',
        'call is complete'
    ];

    const shouldEndCall = endCallPhrases.some(phrase => lowerText.includes(phrase));

    if (shouldEndCall && state.isConversationActive && !state.isEndingCall) {
        console.log('[Avatar] Call end trigger detected:', text.substring(0, 50) + '...');
        state.isEndingCall = true; // Prevent duplicate handling

        // Delay to allow avatar to finish speaking before triggering end handler
        setTimeout(async () => {
            console.log('[Avatar] Triggering end-of-call handler');
            await handleCallEnd();
        }, 2000);
    }
}

/**
 * Handle end of call - analyze and reset.
 * Centralized handler to prevent duplicate processing.
 */
async function handleCallEnd() {
    // Prevent duplicate calls
    if (!state.isConversationActive && !state.isEndingCall) {
        console.log('[handleCallEnd] Already ended, skipping');
        return;
    }

    console.log('[handleCallEnd] Processing end of call');
    state.isConversationActive = false; // Lock against re-entry

    // End the SDK
    if (state.sdk) state.sdk.end();
    highlightDownloadButton();

    // Show overlay immediately with loading animation
    showReportOverlayLoading();

    // Generate report — always returns something, never null
    const report = await generateScenarioReport();
    state.isEndingCall = false;
    renderReport(report);
}

// =============================================================================
// SCENARIO RENDERING
// =============================================================================

/**
 * Render all scenario cards in the sidebar.
 */
function renderScenarios() {
    const lists = {
        interview: document.getElementById('interview-list'),
        postInterview: document.getElementById('post-interview-list'),
        separation: document.getElementById('separation-list')
    };

    // Render each category
    Object.entries(SCENARIOS).forEach(([type, scenarios]) => {
        const listEl = lists[type];
        if (listEl) {
            listEl.innerHTML = scenarios.map(s => createScenarioCardHTML(s, type)).join('');
        }
    });

    // Attach click handlers using event delegation
    document.querySelectorAll('.scenario-list').forEach(list => {
        list.addEventListener('click', (e) => {
            const card = e.target.closest('.scenario-card');
            if (card) {
                selectScenario(card.dataset.id, card.dataset.type);
            }
        });
    });
}

/**
 * Create HTML for a scenario card.
 * @param {Object} scenario - Scenario configuration
 * @param {string} type - Category: 'interview', 'postInterview', 'separation'
 * @returns {string} HTML string
 */
function createScenarioCardHTML(scenario, type) {
    const meta = type === 'interview'
        ? `<span>${escapeHtml(scenario.company)}</span><span>${escapeHtml(scenario.duration)}</span>`
        : `<span>${escapeHtml(scenario.company)}</span><span>${escapeHtml(scenario.type)}</span>`;

    // CSS class needs hyphen for post-interview
    const cssClass = type === 'postInterview' ? 'post-interview' : type;

    return `
        <div class="scenario-card ${cssClass}" data-id="${escapeHtml(scenario.id)}" data-type="${type}">
            <h3>${escapeHtml(scenario.name)}</h3>
            <p>${escapeHtml(scenario.description)}</p>
            <div class="meta">${meta}</div>
        </div>
    `;
}

// =============================================================================
// SCENARIO SELECTION & DETAILS
// =============================================================================

/**
 * Handle scenario selection.
 * @param {string} id - Scenario ID
 * @param {string} type - Category type
 */
async function selectScenario(id, type) {
    // Confirm if switching from active conversation
    if (state.sdk?.getState() === 'in-conversation') {
        if (!confirm('End the current conversation and start a new scenario?')) {
            return;
        }
        state.sdk.end();
    }

    // Reset state - fully clean up to prevent context leakage between scenarios
    state.isConversationActive = false;
    state.lastCallSummary = null;      // Clear analysis from previous call
    state.lastScenarioName = null;     // Clear scenario name
    resetEditedFields();
    clearCV();

    // Update UI selection
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === id);
    });

    // Find and load scenario
    const scenarioList = SCENARIOS[type];
    state.currentScenario = scenarioList?.find(s => s.id === id);

    if (!state.currentScenario) {
        console.error(`Scenario not found: ${id}`);
        return;
    }

    try {
        const url = `${state.currentScenario.file}?v=${CONFIG.VERSION}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        state.scenarioData = await response.json();

        showScenarioDetails();
        ui.scenarioValue.textContent = state.currentScenario.name;
    } catch (error) {
        console.error('Failed to load scenario:', error);
        ui.scenarioValue.textContent = 'Error loading scenario';
    }
}

/**
 * Display scenario details panel with editable fields.
 */
function showScenarioDetails() {
    if (!state.scenarioData) return;

    const mode = state.scenarioData.mode;
    const { subj, role, org, mtg } = state.scenarioData;

    let html = `<h4>Scenario: ${escapeHtml(state.currentScenario?.name)}</h4>`;
    html += buildScenarioFieldsHTML(mode, { subj, role, org, mtg, case: state.scenarioData.case });

    ui.scenarioDetails.innerHTML = html;
    ui.scenarioDetails.style.display = 'block';

    // Set accent color based on mode
    const accentColors = {
        interview: 'var(--accent-interview)',
        post_interview: 'var(--accent-post-interview)',
        separation: 'var(--accent-separation)'
    };
    ui.scenarioDetails.style.borderLeftColor = accentColors[mode] || 'var(--accent-warm)';

    // Setup editable field listeners
    attachEditableFieldListeners();

    // Show appropriate start button/CV panel
    updateStartPanel(mode);
}

/**
 * Build HTML for scenario detail fields based on mode.
 * @param {string} mode - DPP mode
 * @param {Object} data - Scenario data fields
 * @returns {string} HTML string
 */
function buildScenarioFieldsHTML(mode, data) {
    const { subj, role, org, mtg } = data;

    // Common editable fields for all modes
    const personLabel = mode === 'separation' ? 'Employee' : 'Candidate';
    let html = `
        <div class="detail-row editable">
            <label class="label" for="edit-candidate">${personLabel}:</label>
            <input type="text" id="edit-candidate" class="edit-input"
                   value="${escapeHtml(subj?.name)}" placeholder="${personLabel} name">
        </div>
        <div class="detail-row editable">
            <label class="label" for="edit-role">Role:</label>
            <input type="text" id="edit-role" class="edit-input"
                   value="${escapeHtml(role?.t)}" placeholder="Job title">
        </div>
        <div class="detail-row editable">
            <label class="label" for="edit-company">Company:</label>
            <input type="text" id="edit-company" class="edit-input"
                   value="${escapeHtml(org?.n)}" placeholder="Company name">
        </div>
    `;

    // Mode-specific fields
    if (mode === 'interview') {
        html += `
            <div class="detail-row editable">
                <label class="label" for="edit-location">Location:</label>
                <input type="text" id="edit-location" class="edit-input"
                       value="${escapeHtml(role?.loc)}" placeholder="Location">
            </div>
            <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${mtg?.mins || 5} minutes</span>
            </div>
            <div class="detail-row editable focus-row">
                <label class="label" for="edit-focus">Focus:</label>
                <input type="text" id="edit-focus" class="edit-input"
                       value="${escapeHtml(mtg?.focus?.join(', '))}"
                       placeholder="Focus areas (comma-separated)">
            </div>
        `;
    } else if (mode === 'post_interview') {
        const caseType = inferPostInterviewType(data.case);
        html += `
            <div class="detail-row">
                <span class="label">Call Type:</span>
                <span class="value">${escapeHtml(caseType)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${mtg?.mins || 5} minutes</span>
            </div>
        `;
    } else if (mode === 'separation') {
        html += `
            <div class="detail-row">
                <span class="label">Type:</span>
                <span class="value">${escapeHtml(data.case?.type || 'N/A')}</span>
            </div>
            <div class="detail-row editable">
                <label class="label" for="edit-effective">Effective:</label>
                <input type="text" id="edit-effective" class="edit-input"
                       value="${escapeHtml(data.case?.eff)}" placeholder="Effective date">
            </div>
            <div class="detail-row">
                <span class="label">Immediate:</span>
                <span class="value">${data.case?.imm ? 'Yes' : 'No'}</span>
            </div>
        `;
    }

    return html;
}

/**
 * Infer the post-interview call type from case data.
 * @param {Object} caseData - DPP case object
 * @returns {string} Human-readable call type
 */
function inferPostInterviewType(caseData) {
    if (caseData?.type && caseData.type !== 'Other') {
        return caseData.type;
    }
    const firstTalk = caseData?.talk?.[0]?.toLowerCase() || '';
    return firstTalk.includes('offer') ? 'Offer Call' : 'Feedback Call';
}

/**
 * Attach event listeners to editable input fields.
 * Removes existing listeners first to prevent duplicates.
 */
function attachEditableFieldListeners() {
    const fieldIds = ['candidate', 'role', 'company', 'location', 'focus', 'effective'];

    fieldIds.forEach(fieldId => {
        const input = document.getElementById(`edit-${fieldId}`);
        if (!input) return;

        // Create handler with closure over fieldId
        const handler = () => {
            state.editedFields[fieldId] = input.value.trim() || null;
        };

        // Store handler reference for potential cleanup
        input._editHandler = handler;
        input.addEventListener('input', handler);
    });
}

/**
 * Set disabled state on all editable input fields.
 * @param {boolean} disabled
 */
function setEditableFieldsDisabled(disabled) {
    document.querySelectorAll('.scenario-details .edit-input').forEach(input => {
        input.disabled = disabled;
        input.classList.toggle('disabled', disabled);
    });
}

// =============================================================================
// START PANELS (Interview CV Upload / Other Start Button)
// =============================================================================

/**
 * Update which start panel is visible based on mode.
 * Re-enables controls that may have been disabled from a previous conversation.
 * @param {string} mode - DPP mode
 */
function updateStartPanel(mode) {
    if (mode === 'interview') {
        ui.cvUploadPanel.style.display = 'block';
        setCVUploadDisabled(false);
        hideStartCallPanel();
    } else {
        ui.cvUploadPanel.style.display = 'none';
        showStartCallPanel(mode);
        setStartCallPanelDisabled(false);
    }
}

/**
 * Show the start call button panel for non-interview scenarios.
 * @param {string} mode - DPP mode
 */
function showStartCallPanel(mode) {
    let panel = document.getElementById('start-call-panel');

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'start-call-panel';
        panel.className = 'start-call-panel';
        panel.innerHTML = `
            <button class="btn btn-start-call" id="start-call-btn">
                <span>&#9654;</span> Start Call
            </button>
        `;
        ui.scenarioDetails.after(panel);

        document.getElementById('start-call-btn').addEventListener('click', async () => {
            setStartCallPanelDisabled(true);
            setEditableFieldsDisabled(true);
            await startConversation();
        });
    }

    // Set accent color
    const accentColors = {
        post_interview: 'var(--accent-post-interview)',
        separation: 'var(--accent-separation)'
    };
    panel.style.setProperty('--panel-accent', accentColors[mode] || 'var(--accent-warm)');
    panel.style.display = 'block';
}

/**
 * Hide the start call panel.
 */
function hideStartCallPanel() {
    const panel = document.getElementById('start-call-panel');
    if (panel) {
        panel.style.display = 'none';
    }
}

/**
 * Set disabled state on start call button.
 * @param {boolean} disabled
 */
function setStartCallPanelDisabled(disabled) {
    const btn = document.getElementById('start-call-btn');
    if (btn) {
        btn.disabled = disabled;
        btn.classList.toggle('disabled', disabled);
    }
}

// =============================================================================
// CV UPLOAD
// =============================================================================

/**
 * Handle CV file selection.
 * @param {File} file - Selected PDF file
 */
async function handleCVFile(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }

    ui.cvUploadPanel.classList.add('processing');

    try {
        state.cvText = await extractTextFromPDF(file);

        ui.cvFilename.textContent = file.name;
        ui.cvStatus.style.display = 'flex';
        ui.cvUploadPanel.classList.add('has-cv');
        ui.cvUploadPanel.classList.remove('processing');

        console.log('CV extracted:', state.cvText.substring(0, 200) + '...');
    } catch (error) {
        console.error('Failed to extract CV text:', error);
        alert('Failed to read PDF. Please try another file.');
        ui.cvUploadPanel.classList.remove('processing');
        clearCV();
    }
}

/**
 * Extract text from a PDF file using PDF.js.
 * @param {File} file - PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pages.push(textContent.items.map(item => item.str).join(' '));
    }

    return pages.join('\n').trim();
}

/**
 * Clear uploaded CV.
 */
function clearCV() {
    state.cvText = null;
    if (ui.cvFileInput) ui.cvFileInput.value = '';
    if (ui.cvStatus) ui.cvStatus.style.display = 'none';
    if (ui.cvUploadPanel) ui.cvUploadPanel.classList.remove('has-cv');
}

/**
 * Set disabled state on CV upload controls.
 * @param {boolean} disabled
 */
function setCVUploadDisabled(disabled) {
    if (ui.cvFileInput) ui.cvFileInput.disabled = disabled;
    if (ui.startInterviewBtn) ui.startInterviewBtn.disabled = disabled;
    if (ui.cvRemoveBtn) ui.cvRemoveBtn.disabled = disabled;
    if (ui.cvUploadPanel) {
        ui.cvUploadPanel.classList.toggle('disabled', disabled);
    }
}

// =============================================================================
// CONVERSATION CONTROL
// =============================================================================

/**
 * Start the avatar conversation.
 */
async function startConversation() {
    state.isConversationActive = true;
    setEditableFieldsDisabled(true);
    setCVUploadDisabled(true);

    clearTranscriptUI();

    ui.avatarContainer.classList.remove('empty');

    try {
        // Start the SDK - DPP injection happens on SHOWING_AGENT event
        await state.sdk.start();
    } catch (error) {
        console.error('Failed to start conversation:', error);
        updateStatus('error');
        state.isConversationActive = false;
        setEditableFieldsDisabled(false);
        setCVUploadDisabled(false);
    }
}

/**
 * Validate DPP before injection.
 * Catches corrupted state and logs warnings.
 * @param {Object} dpp - DPP object to validate
 * @returns {boolean} True if valid, false if critical errors
 */
function validateDPP(dpp) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!dpp.v) errors.push('Missing: v (schema version)');
    if (!dpp.mode || !['interview', 'post_interview', 'separation'].includes(dpp.mode)) {
        errors.push(`Invalid mode: ${dpp.mode}`);
    }
    if (!dpp.org?.n) errors.push('Missing: org.n (company name)');
    if (!dpp.role?.t) errors.push('Missing: role.t (role title)');
    if (!dpp.subj?.name) errors.push('Missing: subj.name (person name)');

    // Mode-specific validation
    if (dpp.mode === 'interview') {
        if (!dpp.mtg?.mins) warnings.push('Interview missing mtg.mins');
        if (!dpp.eval) warnings.push('Interview missing eval block');
    } else if (dpp.mode === 'post_interview') {
        if (!dpp.case?.talk?.length) errors.push('post_interview requires case.talk array');
    } else if (dpp.mode === 'separation') {
        if (!dpp.case?.talk?.length) errors.push('separation requires case.talk array');
        if (!dpp.case?.type) errors.push('separation requires case.type');
    }

    // Log results
    if (errors.length > 0) {
        console.error('[DPP Validation] Errors:', errors);
        return false;
    }
    if (warnings.length > 0) {
        console.warn('[DPP Validation] Warnings:', warnings);
    }

    return true;
}

/**
 * Build the dynamic prompt JSON string.
 * Applies user edits and CV data to the scenario data.
 * @returns {string|null} JSON string for prompt injection
 */
function buildDynamicPrompt() {
    const source = state.scenarioData || state.selectedDPP;
    if (!source) return null;

    const promptData = state.scenarioData
        ? applyUserEdits(deepClone(state.scenarioData))
        : deepClone(state.selectedDPP);

    // Add CV information if available
    if (state.cvText) {
        promptData.subj = promptData.subj || {};
        promptData.subj.prof = promptData.subj.prof || {};
        promptData.subj.prof.notes = promptData.subj.prof.notes || [];

        promptData.subj.prof.cv_summary = state.cvText;
        promptData.subj.prof.notes.push(
            'IMPORTANT: A CV/resume was provided. Review the cv_summary and ask relevant follow-up questions about their experience, skills, and background mentioned in the CV.'
        );

        promptData.inst = promptData.inst || [];
        promptData.inst.push(
            'Reference specific details from the candidate\'s CV when asking questions. Ask about gaps, interesting projects, or skills mentioned.'
        );
    }

    // Validate before returning
    if (!validateDPP(promptData)) {
        console.error('[DPP] Validation failed - DPP may be malformed');
        // Still return the prompt - let the avatar handle gracefully
    }

    // Debug logging - summary
    console.log('[DPP Build] Context:', {
        mode: promptData.mode,
        company: promptData.org?.n,
        role: promptData.role?.t,
        candidate: promptData.subj?.name,
        duration: promptData.mtg?.mins,
        hasCv: !!state.cvText,
        editedFields: Object.keys(state.editedFields).filter(k => state.editedFields[k])
    });

    const dppJson = JSON.stringify(promptData);

    // Debug logging - full DPP (for troubleshooting)
    console.log('[DPP Build] Full DPP being injected:', dppJson);

    // Update debug panel if it exists
    const debugPanel = document.getElementById('debug-dpp');
    if (debugPanel) {
        debugPanel.textContent = JSON.stringify(promptData, null, 2);
    }

    return dppJson;
}

/**
 * Apply user-edited field overrides to a DPP object.
 * @param {Object} data - DPP object to modify
 * @returns {Object} Modified DPP object
 */
function applyUserEdits(data) {
    const { editedFields } = state;

    if (editedFields.candidate && data.subj) {
        data.subj.name = editedFields.candidate;
    }
    if (editedFields.role && data.role) {
        data.role.t = editedFields.role;
    }
    if (editedFields.company && data.org) {
        data.org.n = editedFields.company;
    }
    if (editedFields.location && data.role) {
        data.role.loc = editedFields.location;
    }
    if (editedFields.focus) {
        data.mtg = data.mtg || {};
        data.mtg.focus = editedFields.focus.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (editedFields.effective) {
        data.case = data.case || {};
        data.case.eff = editedFields.effective;
    }

    return data;
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * Update the status display.
 * @param {string} statusText - Status text to display
 */
function updateStatus(statusText) {
    ui.statusValue.textContent = statusText;
    ui.statusValue.className = 'value';

    if (statusText === 'in-conversation') {
        ui.statusValue.classList.add('status-active');
    } else if (statusText === 'ended' || statusText === 'error') {
        ui.statusValue.classList.add('status-ended');
    }
}

/**
 * Update download button enabled state based on transcript availability.
 */
function updateDownloadButtons() {
    const hasTranscript = state.sdk?.getTranscript().length > 0;
    if (ui.downloadBtn) ui.downloadBtn.disabled = !hasTranscript;
    if (ui.downloadMdBtn) ui.downloadMdBtn.disabled = !hasTranscript;
}

/**
 * Show analyzing state while call summary is being generated.
 * Clears the avatar iframe and shows a loading spinner.
 */
/**
 * Show the report overlay immediately with an animated loading state.
 */
function showReportOverlayLoading() {
    if (!ui.reportOverlay || !ui.reportOverlayInner) return;
    ui.reportOverlayInner.innerHTML = `
        <div class="report-loading">
            <div class="report-loading-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring r2"></div>
                <div class="spinner-ring r3"></div>
            </div>
            <h2 class="report-loading-title">Analyzing Your Session</h2>
            <p class="report-loading-sub">Generating your personalized performance report&hellip;</p>
        </div>
    `;
    ui.reportOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Hide and clear the report overlay.
 */
function hideReportOverlay() {
    if (!ui.reportOverlay) return;
    ui.reportOverlay.style.display = 'none';
    if (ui.reportOverlayInner) ui.reportOverlayInner.innerHTML = '';
    document.body.style.overflow = '';
}

function showAnalyzingState() {
    // End SDK to clear the avatar iframe
    if (state.sdk) {
        state.sdk.end();
    }

    // Show loading spinner in avatar container
    ui.avatarContainer.classList.add('empty');
    ui.avatarContainer.innerHTML = `
        <div class="analyzing-state">
            <div class="spinner"></div>
            <h3>Analyzing Call...</h3>
            <p>Generating your call summary</p>
        </div>
    `;

    updateStatus('analyzing...');
}

/**
 * Highlight download button to draw attention.
 */
function highlightDownloadButton() {
    if (!state.sdk?.getTranscript().length) return;

    ui.downloadBtn.classList.add('pulse');
    setTimeout(() => ui.downloadBtn.classList.remove('pulse'), 2000);
}

/**
 * Reset UI to initial clean state.
 */
function resetToInitialState() {
    // End SDK session
    if (state.sdk) {
        state.sdk.end();
    }

    // Reset state
    state.currentScenario = null;
    state.scenarioData = null;
    state.isConversationActive = false;
    state.isEndingCall = false;
    resetEditedFields();
    clearCV();

    // Clear UI selections
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });

    // Hide panels
    ui.scenarioDetails.style.display = 'none';
    ui.scenarioDetails.innerHTML = '';
    ui.cvUploadPanel.style.display = 'none';
    hideStartCallPanel();

    // Hide avatar, reset selection, show scenario picker
    ui.avatarContainer.innerHTML = '';
    ui.avatarContainer.style.display = 'none';
    state.selectedDPP = null;
    state.selectedScenarioKey = null;
    document.querySelectorAll('.scenario-pick-card').forEach(c => c.classList.remove('active'));
    if (ui.scenarioPickerAction) ui.scenarioPickerAction.style.display = 'none';
    if (ui.scenarioPicker) ui.scenarioPicker.style.display = 'block';

    hideReportOverlay();

    // Reset status
    ui.statusValue.textContent = 'Ready';
    ui.statusValue.className = 'value';
    ui.scenarioValue.textContent = 'None selected';
}

// =============================================================================
// TRANSCRIPT MANAGEMENT
// =============================================================================

/**
 * Add an entry to the transcript display.
 * @param {string} type - 'avatar' or 'user'
 * @param {string} speaker - Display name
 * @param {string} text - Spoken text
 */
function addTranscriptEntry(type, speaker, text) {
    ui.transcriptEmpty.style.display = 'none';

    const entry = document.createElement('div');
    entry.className = `transcript-entry ${type}`;
    entry.innerHTML = `
        <div class="role">${escapeHtml(speaker)}</div>
        <div class="text">${escapeHtml(text)}</div>
        <div class="time">${new Date().toLocaleTimeString()}</div>
    `;

    ui.transcriptContent.appendChild(entry);
    ui.transcriptContent.scrollTop = ui.transcriptContent.scrollHeight;

    // Enable download buttons on first entry only
    if (ui.downloadBtn?.disabled) updateDownloadButtons();
}

/**
 * Clear the transcript UI.
 */
function clearTranscriptUI() {
    ui.transcriptContent.innerHTML = '';
    ui.transcriptEmpty.style.display = 'block';
    ui.transcriptContent.appendChild(ui.transcriptEmpty);
}

/**
 * Download transcript in specified format.
 * @param {string} format - 'text' or 'markdown'
 */
function downloadTranscript(format) {
    if (!state.sdk) return;

    const name = slugify(state.currentScenario?.name || 'session');
    const ext = format === 'markdown' ? 'md' : 'txt';

    state.sdk.downloadTranscript({
        format,
        filename: `hr-transcript-${name}-${getTodayISO()}.${ext}`,
        includeTimestamps: true
    });
}

// =============================================================================
// CALL ANALYSIS
// =============================================================================

/**
 * Analyze the completed call using the Lambda API.
 */
async function analyzeCall() {
    if (!state.sdk || !state.scenarioData) {
        console.log('No call to analyze');
        return;
    }

    const transcript = state.sdk.getTranscript();
    if (!transcript?.length) {
        console.log('Empty transcript, skipping analysis');
        return;
    }

    // Preserve scenario name for download
    state.lastScenarioName = state.currentScenario?.name || 'call';

    updateStatus('analyzing...');

    try {
        const dpp = buildDPPForAnalysis();

        // Format transcript for API (SDK uses 'role', need 'assistant'/'user')
        const formattedTranscript = transcript.map(entry => ({
            role: entry.role === 'Avatar' ? 'assistant' : 'user',
            content: entry.text
        }));

        const response = await fetch(CONFIG.ANALYSIS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: formattedTranscript, dpp })
        });

        const result = await response.json();

        if (result.success) {
            state.lastCallSummary = result.summary;
            console.log('Call analysis complete:', state.lastCallSummary);
            showCallSummary(result.summary);
        } else {
            console.error('Analysis failed:', result.error);
        }
    } catch (error) {
        console.error('Failed to analyze call:', error);
    }
}

/**
 * Build DPP object for analysis API.
 * Ensures CV context is threaded through for consistent evaluation.
 * @returns {Object} DPP with user edits applied
 */
function buildDPPForAnalysis() {
    if (!state.scenarioData) return {};

    const dpp = applyUserEdits(deepClone(state.scenarioData));

    // Add CV information if provided - same as in buildDynamicPrompt for consistency
    if (state.cvText) {
        dpp.subj = dpp.subj || {};
        dpp.subj.prof = dpp.subj.prof || {};
        dpp.subj.prof.notes = dpp.subj.prof.notes || [];

        dpp.subj.prof.cv_summary = state.cvText;
        dpp.subj.prof.notes.push(
            'IMPORTANT: A CV/resume was provided. Review the cv_summary and ask relevant follow-up questions about their experience, skills, and background mentioned in the CV.'
        );

        dpp.inst = dpp.inst || [];
        dpp.inst.push(
            'Reference specific details from the candidate\'s CV when asking questions. Ask about gaps, interesting projects, or skills mentioned.'
        );
    }

    return dpp;
}

/**
 * Display call summary modal.
 * @param {Object} summary - Analysis result
 */
function showCallSummary(summary) {
    let modal = document.getElementById('summary-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'summary-modal';
        modal.className = 'summary-modal';
        document.body.appendChild(modal);
    }

    const fitScore = summary.fit?.score_0_100;
    const fitClass = fitScore >= 70 ? 'good' : fitScore >= 50 ? 'ok' : 'poor';

    modal.innerHTML = `
        <div class="summary-modal-content">
            <div class="summary-header">
                <h3>Call Summary</h3>
                <button class="summary-close-btn" onclick="closeSummaryModal()">&times;</button>
            </div>
            <div class="summary-body">
                <div class="summary-section">
                    <h4>Overview</h4>
                    <p>${escapeHtml(summary.overview || 'No overview available')}</p>
                </div>

                ${fitScore != null ? `
                <div class="summary-section">
                    <h4>Fit Assessment</h4>
                    <div class="fit-score ${fitClass}">
                        <span class="score-value">${fitScore}</span>
                        <span class="score-label">/ 100</span>
                    </div>
                    ${summary.fit.dims?.length ? `
                    <div class="fit-dims">
                        ${summary.fit.dims.map(d => `
                            <div class="dim">
                                <span class="dim-name">${escapeHtml(d.id || d.name || 'Unknown')}</span>
                                <span class="dim-score">${d.score_1_5}/5</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${summary.gaps?.length ? `
                <div class="summary-section">
                    <h4>Gaps & Follow-ups</h4>
                    <ul class="gaps-list">
                        ${summary.gaps.map(g => `<li>${escapeHtml(typeof g === 'string' ? g : g.missing || '')}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                ${summary.next_steps?.length ? `
                <div class="summary-section">
                    <h4>Next Steps</h4>
                    <ul class="next-steps-list">
                        ${summary.next_steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="summary-section">
                    <h4>Call Quality</h4>
                    <div class="cq-badges">
                        <span class="badge">Emotion: ${escapeHtml(summary.cq?.emo || 'unknown')}</span>
                        <span class="badge">Tone: ${escapeHtml(summary.cq?.tone || 'unknown')}</span>
                        <span class="badge">Engagement: ${escapeHtml(summary.cq?.eng || 'unknown')}</span>
                    </div>
                </div>
            </div>
            <div class="summary-footer">
                <button class="btn btn-secondary" onclick="downloadCallSummary()">Download JSON</button>
                <button class="btn btn-primary" onclick="closeSummaryModal()">Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Close summary modal.
 */
function closeSummaryModal() {
    const modal = document.getElementById('summary-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * Download call summary as JSON file.
 */
function downloadCallSummary() {
    if (!state.lastCallSummary) return;

    const name = slugify(state.lastScenarioName || 'call');
    const filename = `call-summary-${name}-${getTodayISO()}.json`;

    const blob = new Blob([JSON.stringify(state.lastCallSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// =============================================================================
// SCENARIO REPORT GENERATION
// =============================================================================

/**
 * Call LiteLLM and return a scenario-specific structured report.
 * Never returns null — always returns {scenarioKey, data, error, transcript}.
 * @returns {Promise<{scenarioKey: string, data: Object|null, error: string|null, transcript: Array}>}
 */
async function generateScenarioReport() {
    const scenarioKey = state.selectedScenarioKey;
    const transcript = state.sdk?.getTranscript() || [];

    // Wrap everything — this function must always return a renderable object
    const fail = (reason) => ({ scenarioKey: scenarioKey || 'churnPrevention', data: null, error: reason, transcript });

    if (!state.sdk)        return fail('Session not available.');
    if (!scenarioKey)      return fail('No scenario was selected.');

    const transcriptText = transcript.length
        ? transcript.map(e => `${e.role}: ${e.text}`).join('\n')
        : '(no speech was recorded for this session)';

    const prompts = {
        churnPrevention: {
            system: `You are a customer success performance coach analyzing how well a CSM handled a churn prevention call. Output ONLY valid JSON, no markdown, no explanation.
Even if the call was very short, still provide scores and at least one recommendation.
Schema: {"retention_likelihood":0-100,"concerns":[{"concern":"str","addressed":"yes|partial|no","note":"str"}],"dimensions":{"rapport":{"score":1-5,"note":"str"},"problem_solving":{"score":1-5,"note":"str"},"value_articulation":{"score":1-5,"note":"str"},"follow_through":{"score":1-5,"note":"str"}},"wins":["str"],"missed":["str"],"summary":"2-3 sentences"}`,
            user: `Analyze this churn prevention call. Avatar was Rachel Kim (VP of Engineering, at-risk customer); User was the AWS Customer Success Manager.\nRachel's known concerns: (1) Degraded support response times, (2) Unexplained 40% bill increase, (3) Unresponsive professional services team, (4) GCP as an active alternative.\n\n${transcriptText}\n\nOutput the JSON assessment.`
        },
        salesTraining: {
            system: `You are an AWS sales training assessor. Output ONLY valid JSON, no markdown, no explanation.
Even if the session was very short, still provide scores and at least one recommendation.
Schema: {"overall_score":0-100,"questions":[{"q":"str","verdict":"strong|partial|weak","note":"str"}],"strengths":["str"],"gaps":["str"],"study_recs":["str"],"summary":"2-3 sentences"}`,
            user: `Analyze this AWS sales training session. Avatar was Alex (AWS Senior Sales Trainer); User was the sales rep being assessed.\n\n${transcriptText}\n\nOutput the JSON assessment.`
        },
        ctoProspect: {
            system: `You are a sales performance coach analyzing an AWS Account Executive's discovery call. Output ONLY valid JSON, no markdown, no explanation.
Even if the call was very short, still provide scores and at least one observation.
Schema: {"deal_likelihood":0-100,"concerns":[{"concern":"str","addressed":"yes|partial|no","note":"str"}],"dimensions":{"discovery":{"score":1-5,"note":"str"},"objection_handling":{"score":1-5,"note":"str"},"value_articulation":{"score":1-5,"note":"str"},"technical_credibility":{"score":1-5,"note":"str"}},"wins":["str"],"missed":["str"],"summary":"2-3 sentences"}`,
            user: `Analyze this AWS discovery call. Avatar was Sam Chen (fintech CTO); User was the AWS Account Executive.\nSam's known concerns: (1) Cost unpredictability, (2) Migration risk to payment systems, (3) PCI-DSS/GDPR compliance, (4) Vendor lock-in, (5) Enterprise support SLAs.\n\n${transcriptText}\n\nOutput the JSON assessment.`
        }
    };

    const p = prompts[scenarioKey];
    if (!p) return fail(`Unknown scenario: ${scenarioKey}`);

    try {
        updateStatus('generating report...');
        const response = await fetch('http://localhost:10006/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (window.APP_CONFIG?.LITELLM_API_KEY || '')
            },
            body: JSON.stringify({
                model: 'claude-4-5-haiku',
                messages: [
                    { role: 'system', content: p.system },
                    { role: 'user', content: p.user }
                ],
                max_tokens: 1024,
                temperature: 0.3
            })
        });

        if (!response.ok) return fail(`Analysis service returned ${response.status}.`);

        const result = await response.json();
        let content = result.choices?.[0]?.message?.content?.trim();
        if (!content) return fail('Analysis service returned an empty response.');

        // Strip markdown code fences if present
        if (content.startsWith('```')) {
            const lines = content.split('\n');
            content = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n');
        }

        return { scenarioKey, data: JSON.parse(content), error: null, transcript };
    } catch (err) {
        console.error('Report generation failed:', err);
        return fail(`Could not generate report: ${err.message}`);
    }
}

// =============================================================================
// REPORT RENDERING
// =============================================================================

/**
 * Render the post-call report in the avatar container.
 * @param {{scenarioKey: string, data: Object}} report
 */
function renderReport(report) {
    if (!ui.reportOverlay || !ui.reportOverlayInner) return;

    const { scenarioKey, data, error, transcript } = report || {};
    let html = '';

    if (error || !data) {
        // Show error card with transcript fallback
        const transcriptHtml = transcript?.length
            ? transcript.map(e => `<div class="report-error-turn ${e.role === 'Avatar' ? 'avatar' : 'user'}"><strong>${escapeHtml(e.role)}:</strong> ${escapeHtml(e.text)}</div>`).join('')
            : '<p class="report-error-empty">No transcript was recorded for this session.</p>';

        html = `
            <div class="report-header report-header--error">
                <div class="report-title-group">
                    <div class="report-badge">Session Complete</div>
                    <h2 class="report-title">Report Unavailable</h2>
                    <p class="report-subtitle">${escapeHtml(error || 'The analysis service could not be reached.')}</p>
                </div>
            </div>
            <div class="report-body">
                <div class="report-section">
                    <h3 class="report-section-title">Session Transcript</h3>
                    <div class="report-error-transcript">${transcriptHtml}</div>
                </div>
            </div>`;
    } else if (scenarioKey === 'churnPrevention')    html = renderChurnReport(data);
    else if (scenarioKey === 'salesTraining') html = renderSalesReport(data);
    else if (scenarioKey === 'ctoProspect')   html = renderCTOReport(data);

    if (!ui.reportOverlay || !ui.reportOverlayInner) return;

    const COUNTDOWN_SEC = 15;

    ui.reportOverlayInner.innerHTML = `
        <div class="report-panel">
            ${html}
            <div class="report-new-session">
                <button class="aws-btn-primary report-back-btn" id="report-back-btn" disabled>
                    &#8592; Start New Session
                    <span class="report-back-countdown" id="report-back-countdown">&nbsp;(${COUNTDOWN_SEC}s)</span>
                </button>
                <button class="aws-btn-hr-connect">
                    &#128279;&nbsp; Connect to HR Systems
                </button>
            </div>
        </div>
    `;

    updateStatus('report ready');

    // Countdown timer — enable the button after COUNTDOWN_SEC seconds
    let remaining = COUNTDOWN_SEC;
    const countdownEl = document.getElementById('report-back-countdown');
    const backBtn = document.getElementById('report-back-btn');

    const tick = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(tick);
            if (countdownEl) countdownEl.remove();
            if (backBtn) {
                backBtn.disabled = false;
                backBtn.onclick = closeReportAndReset;
            }
        } else {
            if (countdownEl) countdownEl.textContent = ` (${remaining}s)`;
        }
    }, 1000);
}

/**
 * Close the report overlay and return to scenario picker.
 */
function closeReportAndReset() {
    hideReportOverlay();
    resetToInitialState();
}

/** Score ring helper — returns HTML for a conic-gradient score circle */
function scoreRing(score, label, color) {
    color = color || '#FF9900';
    return `
        <div class="report-score-ring" style="--ring-pct:${score}%;--ring-color:${color}">
            <div class="ring-inner">
                <span class="ring-score">${score}</span>
                <span class="ring-label">${escapeHtml(label)}</span>
            </div>
        </div>`;
}

/** Dimension bar helper — 1-5 scale */
function dimBar(label, score, note) {
    const pct = Math.round((score / 5) * 100);
    const color = score >= 4 ? '#1d8102' : score >= 3 ? '#0073bb' : '#d13212';
    return `
        <div class="dim-row">
            <div class="dim-meta">
                <span class="dim-name">${escapeHtml(label)}</span>
                <span class="dim-score">${score}/5</span>
            </div>
            <div class="dim-bar"><div class="dim-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            ${note ? `<div class="dim-note">${escapeHtml(note)}</div>` : ''}
        </div>`;
}

/** Verdict badge helper */
function verdictBadge(v) {
    const map = {
        strong: ['verdict-strong', 'Strong'], partial: ['verdict-partial', 'Partial'],
        weak:   ['verdict-weak',   'Weak'],   yes: ['verdict-strong', 'Addressed'],
        no:     ['verdict-weak',   'Not addressed'], addressed: ['verdict-strong', 'Addressed']
    };
    const [cls, label] = map[v] || ['verdict-partial', v];
    return `<span class="verdict-badge ${cls}">${label}</span>`;
}

/** Render churn prevention coaching report */
function renderChurnReport(d) {
    const dims = d.dimensions || {};
    const concerns = d.concerns || [];
    return `
        <div class="report-header report-header--churn">
            <div class="report-title-group">
                <div class="report-badge">Churn Prevention</div>
                <h2 class="report-title">Customer Success Assessment</h2>
                <p class="report-subtitle">How effectively did you retain Rachel Kim's business?</p>
            </div>
            ${scoreRing(d.retention_likelihood || 0, 'Retention Likelihood', '#FF9900')}
        </div>

        <div class="report-body">
            ${concerns.length ? `
            <div class="report-section">
                <h3 class="report-section-title">Customer Concerns Checklist</h3>
                <div class="concern-list">
                    ${concerns.map(c => `
                    <div class="concern-row">
                        <div class="concern-top">
                            <span class="concern-icon">${c.addressed === 'yes' ? '&#10003;' : c.addressed === 'partial' ? '&#126;' : '&#10005;'}</span>
                            <span class="concern-name">${escapeHtml(c.concern)}</span>
                            ${verdictBadge(c.addressed)}
                        </div>
                        ${c.note ? `<div class="concern-note">${escapeHtml(c.note)}</div>` : ''}
                    </div>`).join('')}
                </div>
            </div>` : ''}

            <div class="report-section">
                <h3 class="report-section-title">Performance Dimensions</h3>
                ${dimBar('Rapport',           dims.rapport?.score          || 0, dims.rapport?.note)}
                ${dimBar('Problem Solving',   dims.problem_solving?.score  || 0, dims.problem_solving?.note)}
                ${dimBar('Value Articulation',dims.value_articulation?.score || 0, dims.value_articulation?.note)}
                ${dimBar('Follow-Through',    dims.follow_through?.score   || 0, dims.follow_through?.note)}
            </div>

            <div class="report-two-col">
                ${d.wins?.length ? `
                <div class="report-section">
                    <h3 class="report-section-title">Key Wins</h3>
                    <ul class="report-list report-list--strengths">
                        ${d.wins.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
                    </ul>
                </div>` : ''}

                ${d.missed?.length ? `
                <div class="report-section">
                    <h3 class="report-section-title">Missed Opportunities</h3>
                    <ul class="report-list report-list--gaps">
                        ${d.missed.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
                    </ul>
                </div>` : ''}
            </div>

            ${d.summary ? `
            <div class="report-section report-section--summary">
                <p>${escapeHtml(d.summary)}</p>
            </div>` : ''}
        </div>`;
}

/** Render AWS sales training report */
function renderSalesReport(d) {
    const questions = d.questions || [];
    return `
        <div class="report-header report-header--training">
            <div class="report-title-group">
                <div class="report-badge">Sales Training</div>
                <h2 class="report-title">AWS Knowledge Assessment</h2>
                <p class="report-subtitle">Your performance across AWS product and sales topics</p>
            </div>
            ${scoreRing(d.overall_score || 0, 'Knowledge Score', '#0073bb')}
        </div>

        <div class="report-body">
            ${questions.length ? `
            <div class="report-section">
                <h3 class="report-section-title">Question-by-Question Breakdown</h3>
                <div class="question-list">
                    ${questions.map((q, i) => `
                    <div class="question-row">
                        <div class="question-top">
                            <span class="question-num">Q${i + 1}</span>
                            <span class="question-text">${escapeHtml(q.q)}</span>
                            ${verdictBadge(q.verdict)}
                        </div>
                        ${q.note ? `<div class="question-note">${escapeHtml(q.note)}</div>` : ''}
                    </div>`).join('')}
                </div>
            </div>` : ''}

            <div class="report-two-col">
                ${d.strengths?.length ? `
                <div class="report-section">
                    <h3 class="report-section-title">Strengths</h3>
                    <ul class="report-list report-list--strengths">
                        ${d.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                    </ul>
                </div>` : ''}

                ${d.gaps?.length ? `
                <div class="report-section">
                    <h3 class="report-section-title">Knowledge Gaps</h3>
                    <ul class="report-list report-list--gaps">
                        ${d.gaps.map(g => `<li>${escapeHtml(g)}</li>`).join('')}
                    </ul>
                </div>` : ''}
            </div>

            ${d.study_recs?.length ? `
            <div class="report-section">
                <h3 class="report-section-title">Study Recommendations</h3>
                <ul class="report-list report-list--recs">
                    ${d.study_recs.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
            </div>` : ''}

            ${d.summary ? `
            <div class="report-section report-section--summary">
                <p>${escapeHtml(d.summary)}</p>
            </div>` : ''}
        </div>`;
}

/** Render CTO discovery call report */
function renderCTOReport(d) {
    const dims = d.dimensions || {};
    const concerns = d.concerns || [];
    return `
        <div class="report-header report-header--prospect">
            <div class="report-title-group">
                <div class="report-badge">Sales Pitch</div>
                <h2 class="report-title">CTO Discovery Call Assessment</h2>
                <p class="report-subtitle">How effectively did you handle Sam Chen's concerns?</p>
            </div>
            ${scoreRing(d.deal_likelihood || 0, 'Deal Likelihood', '#1d8102')}
        </div>

        <div class="report-body">
            ${concerns.length ? `
            <div class="report-section">
                <h3 class="report-section-title">CTO Concerns Checklist</h3>
                <div class="concern-list">
                    ${concerns.map(c => `
                    <div class="concern-row">
                        <div class="concern-top">
                            <span class="concern-icon">${c.addressed === 'yes' ? '&#10003;' : c.addressed === 'partial' ? '&#126;' : '&#10005;'}</span>
                            <span class="concern-name">${escapeHtml(c.concern)}</span>
                            ${verdictBadge(c.addressed)}
                        </div>
                        ${c.note ? `<div class="concern-note">${escapeHtml(c.note)}</div>` : ''}
                    </div>`).join('')}
                </div>
            </div>` : ''}

            <div class="report-section">
                <h3 class="report-section-title">Sales Dimensions</h3>
                ${dimBar('Discovery Quality',      dims.discovery?.score          || 0, dims.discovery?.note)}
                ${dimBar('Objection Handling',     dims.objection_handling?.score || 0, dims.objection_handling?.note)}
                ${dimBar('Value Articulation',     dims.value_articulation?.score || 0, dims.value_articulation?.note)}
                ${dimBar('Technical Credibility',  dims.technical_credibility?.score || 0, dims.technical_credibility?.note)}
            </div>

            <div class="report-two-col">
                ${d.wins?.length ? `
                <div class="report-section">
                    <h3 class="report-section-title">Key Wins</h3>
                    <ul class="report-list report-list--strengths">
                        ${d.wins.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
                    </ul>
                </div>` : ''}

                ${d.missed?.length ? `
                <div class="report-section">
                    <h3 class="report-section-title">Missed Opportunities</h3>
                    <ul class="report-list report-list--gaps">
                        ${d.missed.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
                    </ul>
                </div>` : ''}
            </div>

            ${d.summary ? `
            <div class="report-section report-section--summary">
                <p>${escapeHtml(d.summary)}</p>
            </div>` : ''}
        </div>`;
}

// =============================================================================
// EVENT LISTENERS SETUP
// =============================================================================

/**
 * Attach all event listeners.
 * Called once after DOM is ready.
 */
function attachEventListeners() {
    // CV file input
    ui.cvFileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) handleCVFile(e.target.files[0]);
    });

    // CV remove button
    ui.cvRemoveBtn?.addEventListener('click', clearCV);

    // Start interview button
    ui.startInterviewBtn?.addEventListener('click', async () => {
        setCVUploadDisabled(true);
        setEditableFieldsDisabled(true);
        await startConversation();
    });

    // Drag and drop for CV
    ui.cvUploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        ui.cvUploadArea.classList.add('dragover');
    });

    ui.cvUploadArea?.addEventListener('dragleave', () => {
        ui.cvUploadArea.classList.remove('dragover');
    });

    ui.cvUploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        ui.cvUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files?.length) handleCVFile(e.dataTransfer.files[0]);
    });

    // Download buttons
    ui.downloadBtn?.addEventListener('click', () => downloadTranscript('text'));
    ui.downloadMdBtn?.addEventListener('click', () => downloadTranscript('markdown'));

    // Scenario picker cards
    document.querySelectorAll('.scenario-pick-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.scenario;
            const dppKey = { 'churn-prevention': 'churnPrevention', 'sales-training': 'salesTraining', 'cto-prospect': 'ctoProspect' }[id];
            if (!dppKey) return;

            // Highlight selected card
            document.querySelectorAll('.scenario-pick-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Store selection
            state.selectedDPP = SCENARIO_DPPS[dppKey];
            state.selectedScenarioKey = dppKey;

            // Show begin button
            if (ui.scenarioPickerAction) ui.scenarioPickerAction.style.display = 'flex';
        });
    });

    // Begin session button
    ui.beginSessionBtn?.addEventListener('click', () => {
        if (!state.selectedDPP) return;
        if (ui.scenarioPicker) ui.scenarioPicker.style.display = 'none';
        ui.avatarContainer.style.display = 'flex';
        startConversation();
    });

    // Detect when user clicks the Kaltura "Leave" button (injected dynamically by SDK)
    document.addEventListener('click', async (e) => {
        if (e.target?.id === 'leaveRoomBtn' || e.target?.closest('#leaveRoomBtn')) {
            if (state.isConversationActive || state.isEndingCall) {
                await handleCallEnd();
            }
        }
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    attachEventListeners();
    renderScenarios();
    initSDK();
    state.sdk.init(); // Pre-initialize immediately (synchronous with hardcoded talkUrl)
    // Hide avatar container until a scenario is chosen
    ui.avatarContainer.style.display = 'none';
});
