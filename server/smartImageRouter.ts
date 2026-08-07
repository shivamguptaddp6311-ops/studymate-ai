/**
 * Smart Image Routing & Prompt Enforcement Engine
 * 
 * Production-grade prompt routing system engineered specifically for Gemini Imagen,
 * FLUX, and diffusion models to maximize prompt adherence, scientific accuracy, structural
 * precision, and label preservation in educational and technical visual generation.
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Intent Analysis: Category-independent natural language phrase detector for scientific intent.
 * 2. Weighted Category Classifier: Contextual scoring engine across 10 standard categories.
 * 3. Scientific Mode Auto-Router: Deterministic mapping between categories and scientific mode.
 * 4. Prompt Preservation Layer: Preserves original user request verbatim alongside metadata.
 * 5. Negative Constraint Builder: Generates category-aware, prompt-aware negative prompts.
 * 6. Category-Specific Prompt Builders: Tailored guidance without forced contradictory defaults.
 * 7. Prompt Validation: Textual audit detecting hardcoded style/label conflicts.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ImageCategory =
  | "Medical Illustration"
  | "Scientific Diagram"
  | "Educational Chart"
  | "Technical Diagram"
  | "Mathematical Figure"
  | "Architecture"
  | "Product Image"
  | "Portrait"
  | "Artistic Illustration"
  | "General Image";

export type ImageQualityMode = "fast" | "balanced" | "hd";

export type EnforcementLevel = "strict" | "standard" | "creative";

export interface IntentAnalysisResult {
  /** Confidence score normalized between 0.0 and 1.0 */
  confidence: number;
  /** Whether scientific/educational intent was detected in natural language */
  isScientificIntent: boolean;
  /** Specific natural language phrases matched */
  matchedPhrases: string[];
}

export interface CategoryClassificationResult {
  category: ImageCategory;
  /** Classification confidence score between 0.0 and 1.0 */
  confidence: number;
  /** Raw category scores breakdown */
  categoryScores: Record<string, number>;
}

export interface PreservedElements {
  requestedSubject: string;
  diagramType: string | null;
  orientationView: string | null;
  labelsMentioned: string[];
  isLabelRequested: boolean;
  explicitStyle: string | null;
}

export interface PromptValidationResult {
  isValid: boolean;
  objectPreserved: boolean;
  diagramRequested: boolean;
  labelsRequired: boolean;
  backgroundSpecified: boolean;
  styleSpecified: boolean;
  forbiddenTermsRemoved: boolean;
  score: number; // 0 to 100
  warnings: string[];
}

export interface SmartRoutingResult {
  category: ImageCategory;
  /** Overall confidence score (0.0 to 1.0) */
  confidence: number;
  /** Whether the request was routed to High Accuracy Scientific Mode */
  scientificMode: boolean;
  /** Backward compatibility alias for scientificMode */
  isScientificMode: boolean;
  /** Backward compatibility alias for scientificMode */
  isHighAccuracyScientificMode: boolean;
  /** Transformed, enforced prompt string optimized for model execution */
  enhancedPrompt: string;
  /**
   * Negative constraints returned as a string array (string[]) so callers
   * can pass them directly to dedicated model parameters.
   */
  negativeConstraints: string[];
  /** String-joined helper version of negative constraints for single-field APIs */
  negativeConstraintsText: string;
  qualityMode: ImageQualityMode;
  /** Signals that caller may retry with retryLevel: 1 if first output fails validation */
  retryRecommended: boolean;
  /** Pre-constructed Level 1 maximum enforcement prompt for instant retry (undefined for non-scientific) */
  retryPrompt?: string;
  /** Detailed prompt validation metadata */
  validation: PromptValidationResult;
  enforcementLevel: EnforcementLevel;
  preservedElements: PreservedElements;
}

// Backward compatibility type alias
export type SmartImageRoutingResult = SmartRoutingResult;

// ============================================================================
// CONSTANTS & RULE TABLES
// ============================================================================

export const SCIENTIFIC_CATEGORIES: ReadonlySet<ImageCategory> = new Set([
  "Medical Illustration",
  "Scientific Diagram",
  "Educational Chart",
  "Technical Diagram",
  "Mathematical Figure",
]);

export const ALL_IMAGE_CATEGORIES: readonly ImageCategory[] = [
  "Medical Illustration",
  "Scientific Diagram",
  "Educational Chart",
  "Technical Diagram",
  "Mathematical Figure",
  "Architecture",
  "Product Image",
  "Portrait",
  "Artistic Illustration",
  "General Image",
] as const;

// Normalized category alias map for exact matching (Requirement 1)
const CATEGORY_ALIAS_MAP: Readonly<Record<string, ImageCategory>> = {
  "medical illustration": "Medical Illustration",
  "medical_illustration": "Medical Illustration",
  "medical-illustration": "Medical Illustration",
  "medical": "Medical Illustration",
  "anatomy": "Medical Illustration",
  "anatomical": "Medical Illustration",

  "scientific diagram": "Scientific Diagram",
  "scientific_diagram": "Scientific Diagram",
  "scientific-diagram": "Scientific Diagram",
  "scientific": "Scientific Diagram",
  "biology": "Scientific Diagram",
  "science": "Scientific Diagram",

  "educational chart": "Educational Chart",
  "educational_chart": "Educational Chart",
  "educational-chart": "Educational Chart",
  "educational": "Educational Chart",
  "chart": "Educational Chart",
  "infographic": "Educational Chart",
  "flowchart": "Educational Chart",

  "technical diagram": "Technical Diagram",
  "technical_diagram": "Technical Diagram",
  "technical-diagram": "Technical Diagram",
  "technical": "Technical Diagram",
  "schematic": "Technical Diagram",
  "blueprint": "Technical Diagram",
  "circuit": "Technical Diagram",

  "mathematical figure": "Mathematical Figure",
  "mathematical_figure": "Mathematical Figure",
  "mathematical-figure": "Mathematical Figure",
  "mathematical": "Mathematical Figure",
  "math": "Mathematical Figure",
  "geometry": "Mathematical Figure",

  "architecture": "Architecture",
  "architectural": "Architecture",
  "floorplan": "Architecture",
  "building": "Architecture",

  "product image": "Product Image",
  "product_image": "Product Image",
  "product-image": "Product Image",
  "product": "Product Image",
  "mockup": "Product Image",
  "commercial": "Product Image",

  "portrait": "Portrait",
  "headshot": "Portrait",

  "artistic illustration": "Artistic Illustration",
  "artistic_illustration": "Artistic Illustration",
  "artistic-illustration": "Artistic Illustration",
  "artistic": "Artistic Illustration",
  "art": "Artistic Illustration",
  "illustration": "Artistic Illustration",
  "painting": "Artistic Illustration",
  "drawing": "Artistic Illustration",

  "general image": "General Image",
  "general_image": "General Image",
  "general-image": "General Image",
  "general": "General Image",

  // Style IDs from ImageGenerator frontend component
  "realistic": "General Image",
  "anime": "Artistic Illustration",
  "3d": "Artistic Illustration",
  "3d render": "Artistic Illustration",
  "3d-render": "Artistic Illustration",
  "cartoon": "Artistic Illustration",
  "digital art": "Artistic Illustration",
  "digital-art": "Artistic Illustration",
  "digital_art": "Artistic Illustration",
  "sketch": "Artistic Illustration",
  "cinematic": "General Image",
  "diagram": "Educational Chart",
};

/**
 * Normalizes case, trims whitespace, and replaces dividers to perform an exact alias match.
 * Unknown hints (e.g. "cartography", "figure") return null and are ignored.
 */
export function normalizeCategoryHint(userCategoryHint?: string): ImageCategory | null {
  if (!userCategoryHint || typeof userCategoryHint !== "string") {
    return null;
  }
  const clean = userCategoryHint.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  return CATEGORY_ALIAS_MAP[clean] || null;
}

// ============================================================================
// LAYER 1: CATEGORY-INDEPENDENT SCIENTIFIC INTENT DETECTOR
// ============================================================================

interface NaturalPhrasePattern {
  readonly pattern: RegExp;
  readonly weight: number;
  readonly phrase: string;
}

const SCIENTIFIC_INTENT_PATTERNS: readonly NaturalPhrasePattern[] = [
  { pattern: /\blabel(?:led)?\s+the\s+parts\b/i, weight: 0.45, phrase: "label the parts" },
  { pattern: /\bdraw\s+the\s+.+\s+with\s+labels\b/i, weight: 0.45, phrase: "draw with labels" },
  { pattern: /\bparts?\s+of\s+.+\s+with\s+labels\b/i, weight: 0.40, phrase: "parts of X with labels" },
  { pattern: /\blabel(?:led)?\s+diagram\b/i, weight: 0.40, phrase: "labelled diagram" },
  { pattern: /\banatomy\s+diagram\b/i, weight: 0.40, phrase: "anatomy diagram" },
  { pattern: /\bbiology\s+textbook\b/i, weight: 0.40, phrase: "biology textbook" },
  { pattern: /\bmedical\s+illustration\b/i, weight: 0.40, phrase: "medical illustration" },
  { pattern: /\bexplain\s+with\s+(?:a\s+)?diagram\b/i, weight: 0.35, phrase: "explain with a diagram" },
  { pattern: /\blabel(?:led)?\s+structure\b/i, weight: 0.35, phrase: "labelled structure" },
  { pattern: /\bexam(?:ination)?\s+diagram\b/i, weight: 0.35, phrase: "exam diagram" },
  { pattern: /\beducational\s+illustration\b/i, weight: 0.35, phrase: "educational illustration" },
  { pattern: /\bscientific\s+figure\b/i, weight: 0.35, phrase: "scientific figure" },
  { pattern: /\bcross[- ]section\b/i, weight: 0.35, phrase: "cross-section" },
  { pattern: /\bneuron\s+structure\b/i, weight: 0.35, phrase: "neuron structure" },
  { pattern: /\bdigestive\s+system\s+diagram\b/i, weight: 0.35, phrase: "digestive system diagram" },
  { pattern: /\bhow\s+.+\s+works?\s*(?:diagram)?\b/i, weight: 0.30, phrase: "how X works" },
  { pattern: /\bfor\s+my\s+(?:exam|class|test|quiz|course)\b/i, weight: 0.25, phrase: "for my exam/class" },
  { pattern: /\banatomical\s+structure\b/i, weight: 0.35, phrase: "anatomical structure" },
  { pattern: /\btextbook\s+illustration\b/i, weight: 0.35, phrase: "textbook illustration" },
  { pattern: /\bbiology\s+figure\b/i, weight: 0.35, phrase: "biology figure" },
];

/**
 * Analyzes natural language intent to detect scientific/educational purpose.
 * Note: Confidence scores are heuristic estimates.
 */
export function analyzeScientificIntent(
  prompt: string,
  userCategoryHint?: string
): IntentAnalysisResult {
  if (!prompt || typeof prompt !== "string") {
    return { confidence: 0, isScientificIntent: false, matchedPhrases: [] };
  }

  const cleanPrompt = prompt.trim();
  let rawScore = 0;
  const matchedPhrases: string[] = [];

  for (const item of SCIENTIFIC_INTENT_PATTERNS) {
    if (item.pattern.test(cleanPrompt)) {
      rawScore += item.weight;
      matchedPhrases.push(item.phrase);
    }
  }

  const validHint = normalizeCategoryHint(userCategoryHint);
  if (validHint && SCIENTIFIC_CATEGORIES.has(validHint)) {
    rawScore += 0.35;
    matchedPhrases.push(`hint:${validHint}`);
  }

  const confidence = Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(2))));
  const isScientificIntent = confidence >= 0.35;

  return {
    confidence,
    isScientificIntent,
    matchedPhrases,
  };
}

// ============================================================================
// LAYER 2: WEIGHTED KEYWORD CATEGORY CLASSIFIER
// ============================================================================

interface CategoryScoringRule {
  readonly pattern: RegExp;
  readonly weight: number;
}

const CATEGORY_RULES: Readonly<Record<ImageCategory, readonly CategoryScoringRule[]>> = {
  "Medical Illustration": [
    { pattern: /\b(anatomy|anatomical|histology|histological|pathology|pathological|surgical|clinical)\b/i, weight: 0.50 },
    { pattern: /\bmedical\s+(illustration|diagram|drawing|figure|render)\b/i, weight: 0.50 },
    { pattern: /\b(human|animal|patient)\s+(heart|brain|liver|kidney|lung|lungs|stomach|skull|skeleton|spine|organ|tissue|cell|cells|bone)\b/i, weight: 0.45 },
    { pattern: /\b(cross[- ]section|structure|diagram)\s+of\s+(the\s+)?(human|body|heart|brain|organ|tissue|neuron|eye|ear|spine)\b/i, weight: 0.45 },
    { pattern: /\b(digestive|nervous|cardiovascular|circulatory|respiratory|muscular|skeletal|vascular|lymphatic)\s+system\b/i, weight: 0.45 },
    { pattern: /\b(neuron|synapse|myocardium|epidermis|nephron|alveoli|histology)\b/i, weight: 0.40 },
  ],
  "Scientific Diagram": [
    { pattern: /\bscientific\s+(diagram|figure|illustration|process)\b/i, weight: 0.50 },
    { pattern: /\b(photosynthesis|mitosis|meiosis|cellular respiration|dna replication|water cycle|carbon cycle)\b/i, weight: 0.45 },
    { pattern: /\b(chemistry|chemical|molecular|molecule|atomic|atom|element|periodic table)\b/i, weight: 0.40 },
    { pattern: /\b(physics|quantum|thermodynamics|optics|magnetic field|gravity)\b/i, weight: 0.40 },
    { pattern: /\b(laboratory|lab experiment|microscope|spectroscopy)\b/i, weight: 0.35 },
  ],
  "Educational Chart": [
    { pattern: /\b(educational\s+chart|infographic|flowchart|flow[- ]chart|mind[- ]map|concept[- ]map|timeline)\b/i, weight: 0.50 },
    { pattern: /\b(venn\s+diagram|bar\s+chart|pie\s+chart|scatter\s+plot|comparison\s+chart)\b/i, weight: 0.45 },
    { pattern: /\b(educational|textbook|lesson|curriculum)\s+(chart|diagram|graphic|illustration)\b/i, weight: 0.40 },
  ],
  "Technical Diagram": [
    { pattern: /\b(schematic|blueprint|circuit|circuits|wiring\s+diagram|block\s+diagram|architecture\s+diagram)\b/i, weight: 0.50 },
    { pattern: /\b(electrical|electronic|engineering|cad|vector\s+schematic|cad\s+drawing)\b/i, weight: 0.40 },
    { pattern: /\b(system\s+architecture|network\s+topology|uml|component\s+diagram)\b/i, weight: 0.40 },
  ],
  "Mathematical Figure": [
    { pattern: /\b(geometry|geometric|mathematical|math)\s+(figure|diagram|proof|illustration)\b/i, weight: 0.50 },
    { pattern: /\b(pythagorean|calculus|trigonometry|coordinate\s+plane|parabola|hyperbola|fractal)\b/i, weight: 0.45 },
    { pattern: /\b(equation|formula|matrix|vector\s+space|polynomial|integral)\s+(diagram|graph|plot|figure)\b/i, weight: 0.40 },
  ],
  "Architecture": [
    { pattern: /\barchitectural\b/i, weight: 0.45 },
    { pattern: /\b(building|house|skyscraper|facade|elevation|floor\s*plan|structural\s+design|urban\s+planning)\b/i, weight: 0.40 },
    { pattern: /\barchitectural\s+(cross[- ]section|drawing|rendering|photograph|blueprint)\b/i, weight: 0.50 },
  ],
  "Product Image": [
    { pattern: /\b(product\s+photo|product\s+photography|studio\s+product|product\s+shot|packaging\s+design|product\s+design)\b/i, weight: 0.50 },
    { pattern: /\b(perfume\s+bottle|cell\s+phone|pendant|skeleton\s+key|mockup|e-commerce\s+shot)\b/i, weight: 0.45 },
    { pattern: /\b(bottle|box|can|merchandise|packaging)\s+(photo|shot|mockup)\b/i, weight: 0.40 },
  ],
  "Portrait": [
    { pattern: /\b(portrait|headshot|character\s+portrait|self-portrait|face\s+photo)\b/i, weight: 0.50 },
    { pattern: /\bportrait\s+holding\b/i, weight: 0.50 },
    { pattern: /\b(person|character|man|woman|child)\s+(holding|standing|sitting|posing)\b/i, weight: 0.30 },
  ],
  "Artistic Illustration": [
    { pattern: /\b(watercolor|oil\s+painting|digital\s+art|sketch|concept\s+art|anime|manga|fantasy\s+art|surreal)\b/i, weight: 0.45 },
    { pattern: /\b(painting|illustration|artwork|drawing)\s+of\b/i, weight: 0.35 },
    { pattern: /\bbrain-shaped\s+logo\b/i, weight: 0.50 },
  ],
  "General Image": [],
};

// Disambiguation patterns that penalize Medical Illustration for non-medical usages (Requirement 2)
const MEDICAL_DISAMBIGUATION_PATTERNS: readonly { readonly pattern: RegExp; readonly penalty: number }[] = [
  { pattern: /\bcell\s+phone\b/i, penalty: 1.0 },
  { pattern: /\bcellular\s+phone\b/i, penalty: 1.0 },
  { pattern: /\bmuscle\s+car\b/i, penalty: 1.0 },
  { pattern: /\bpipe\s+organ\b/i, penalty: 1.0 },
  { pattern: /\borgan\s+(music|inside|in\s+a)\b/i, penalty: 1.0 },
  { pattern: /\bheart-shaped\b/i, penalty: 1.0 },
  { pattern: /\bheart\s+shaped\b/i, penalty: 1.0 },
  { pattern: /\bskeleton\s+key\b/i, penalty: 1.0 },
  { pattern: /\bbrain-shaped\b/i, penalty: 1.0 },
  { pattern: /\bbrain\s+shaped\b/i, penalty: 1.0 },
  { pattern: /\bholding\s+a\s+heart\b/i, penalty: 1.0 },
];

/**
 * Classifies prompt into one of 10 standard categories using weighted contextual scoring.
 * Enforces minimum thresholds and deterministic tie-breaking.
 */
export function classifyCategoryWithScoring(
  prompt: string,
  userCategoryHint?: string
): CategoryClassificationResult {
  const cleanPrompt = (prompt || "").trim();
  const lower = cleanPrompt.toLowerCase();

  // Initialize scores dictionary for all 10 categories
  const categoryScores: Record<string, number> = {};
  for (const cat of ALL_IMAGE_CATEGORIES) {
    categoryScores[cat] = 0.0;
  }
  categoryScores["General Image"] = 0.10; // baseline score

  // 1. Authoritative check for valid category hint
  const validHint = normalizeCategoryHint(userCategoryHint);
  if (validHint) {
    for (const cat of ALL_IMAGE_CATEGORIES) {
      categoryScores[cat] = cat === validHint ? 1.0 : 0.0;
    }
    return {
      category: validHint,
      confidence: 0.95,
      categoryScores,
    };
  }

  // 2. Multi-signal rule evaluation
  for (const [catName, rules] of Object.entries(CATEGORY_RULES)) {
    let catScore = categoryScores[catName] || 0;
    for (const rule of rules) {
      if (rule.pattern.test(lower)) {
        catScore += rule.weight;
      }
    }
    categoryScores[catName] = Number(catScore.toFixed(3));
  }

  // 3. Apply Medical Illustration disambiguation penalties
  for (const d of MEDICAL_DISAMBIGUATION_PATTERNS) {
    if (d.pattern.test(lower)) {
      categoryScores["Medical Illustration"] = Math.max(0, categoryScores["Medical Illustration"] - d.penalty);
    }
  }

  // 4. Boost Product Image if ambiguous keywords occur in product contexts
  if (/\b(product\s+photo|product\s+shot|pendant|cell\s+phone|skeleton\s+key)\b/i.test(lower)) {
    if (!categoryScores["Product Image"] || categoryScores["Product Image"] < 0.4) {
      categoryScores["Product Image"] = 0.50;
    }
  }

  // 5. Boost Portrait if portrait holding pattern matches
  if (/\bportrait\s+holding\b/i.test(lower)) {
    categoryScores["Portrait"] = Math.max(categoryScores["Portrait"], 0.60);
  }

  // 6. Select highest score with minimum threshold and deterministic tie-breaking
  const MIN_SCORE_THRESHOLD = 0.30;
  let bestCategory: ImageCategory = "General Image";
  let maxScore = categoryScores["General Image"];

  // Tie-breaking order matches ALL_IMAGE_CATEGORIES array order
  for (const cat of ALL_IMAGE_CATEGORIES) {
    const score = categoryScores[cat] || 0;
    if (score >= MIN_SCORE_THRESHOLD && score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  // Calculate heuristic confidence score
  const confidence = maxScore > 0.10
    ? Math.min(0.95, Math.max(0.35, Number((0.35 + maxScore * 0.5).toFixed(2))))
    : 0.30;

  return {
    category: bestCategory,
    confidence,
    categoryScores,
  };
}

export function classifyImageCategory(prompt: string, userCategoryHint?: string): ImageCategory {
  return classifyCategoryWithScoring(prompt, userCategoryHint).category;
}

export const classifyImagePrompt = classifyImageCategory;

// ============================================================================
// LAYER 4: PROMPT PRESERVATION LAYER & LABEL INTENT DETECTOR
// ============================================================================

export type LabelIntentState = "required" | "forbidden" | "unspecified";

/**
 * Detects positive and negative label intent states from prompt text.
 * Explicit negative label intent always takes precedence.
 */
export function detectLabelIntent(prompt: string): LabelIntentState {
  const lower = (prompt || "").toLowerCase();

  const NEGATIVE_LABEL_PATTERNS = [
    /\bunlabelled\b/i,
    /\bunlabeled\b/i,
    /\bwithout\s+labels\b/i,
    /\bno\s+labels\b/i,
    /\bdo\s+not\s+(?:add|include)\s+labels\b/i,
    /\bno\s+annotations\b/i,
    /\bwithout\s+annotations\b/i,
  ];

  for (const p of NEGATIVE_LABEL_PATTERNS) {
    if (p.test(lower)) {
      return "forbidden";
    }
  }

  const POSITIVE_LABEL_PATTERNS = [
    /\blabelled\b/i,
    /\blabeled\b/i,
    /\bannotated\b/i,
    /\bwith\s+labels\b/i,
    /\binclude\s+labels\b/i,
    /\bshow\s+labels\b/i,
    /\badd\s+labels\b/i,
    /\blabel\s+the\s+parts\b/i,
    /\blabels\s*:/i,
    /\bannotations\s*:/i,
  ];

  for (const p of POSITIVE_LABEL_PATTERNS) {
    if (p.test(lower)) {
      return "required";
    }
  }

  return "unspecified";
}

/**
 * Parses user prompt to extract metadata without modifying the complete original request.
 */
export function extractPreservedElements(prompt: string): PreservedElements {
  const clean = (prompt || "").trim();
  const lower = clean.toLowerCase();

  // The complete original prompt remains verbatim as the requested subject
  const requestedSubject = clean;

  // Extract diagram type metadata
  let diagramType: string | null = null;
  if (/\b(cross[- ]section)\b/i.test(lower)) diagramType = "cross-section diagram";
  else if (/\b(schematic)\b/i.test(lower)) diagramType = "schematic diagram";
  else if (/\b(flowchart|flow[- ]chart)\b/i.test(lower)) diagramType = "flowchart";
  else if (/\b(mind[- ]map|concept[- ]map)\b/i.test(lower)) diagramType = "mind map";
  else if (/\b(floor\s*plan)\b/i.test(lower)) diagramType = "floor plan";
  else if (/\b(diagram)\b/i.test(lower)) diagramType = "diagram";

  // Extract orientation/view metadata
  let orientationView: string | null = null;
  if (/\bsagittal\b/i.test(lower)) orientationView = "sagittal view";
  else if (/\banterior\b/i.test(lower)) orientationView = "anterior view";
  else if (/\bposterior\b/i.test(lower)) orientationView = "posterior view";
  else if (/\blateral\b/i.test(lower)) orientationView = "lateral view";
  else if (/\bcutaway\b/i.test(lower)) orientationView = "cutaway view";
  else if (/\b(top-down|top\s+view)\b/i.test(lower)) orientationView = "top-down view";
  else if (/\b(3d|three-dimensional)\b/i.test(lower)) orientationView = "3D perspective view";
  else if (/\b(2d|two-dimensional)\b/i.test(lower)) orientationView = "2D flat view";

  // Detect label intent state
  const labelIntent = detectLabelIntent(clean);
  const isLabelRequested = labelIntent === "required";

  // Extract conservative list of labels if explicitly provided
  const labelsMentioned: string[] = [];
  if (isLabelRequested) {
    const labelListMatch = clean.match(/(?:labels|annotations|parts)\s*:\s*([^.\n;]+)/i) ||
                           clean.match(/(?:labelled|labeled|annotated)\s+with\s+([^.\n;]+)/i);
    if (labelListMatch && labelListMatch[1]) {
      const parts = labelListMatch[1].split(/,|\band\b/i);
      for (const p of parts) {
        const item = p.trim().replace(/^and\s+/i, "").replace(/[._]$/, "");
        if (item.length > 0 && item.length < 40) {
          labelsMentioned.push(item);
        }
      }
    }
  }

  // Extract style metadata
  let explicitStyle: string | null = null;
  if (/\bwatercolor\b/i.test(lower)) explicitStyle = "watercolor painting";
  else if (/\boil\s+painting\b/i.test(lower)) explicitStyle = "oil painting";
  else if (/\b(monochrome|black\s+and\s+white)\b/i.test(lower)) explicitStyle = "monochrome";
  else if (/\bline\s+art\b/i.test(lower)) explicitStyle = "line art";
  else if (/\bphotograph\b/i.test(lower)) explicitStyle = "photograph";

  return {
    requestedSubject,
    diagramType,
    orientationView,
    labelsMentioned: labelsMentioned.slice(0, 10),
    isLabelRequested,
    explicitStyle,
  };
}

// ============================================================================
// SUBJECT & STYLE GUIDANCE HELPERS
// ============================================================================

export function cleanConversationalNoise(prompt: string): string {
  if (!prompt || typeof prompt !== "string") return "";
  return prompt
    .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:generate|create|draw|make|show|render)\s+(?:a|an|me)?\s*(?:picture|image|photo|drawing|illustration|diagram)?\s*(?:of)?\s*/i, "")
    .replace(/^(?:a\s+picture\s+of|a\s+photo\s+of|a\s+drawing\s+of|an\s+image\s+of)\s*/i, "")
    .trim() || prompt.trim();
}

export interface SubjectGuidance {
  guidance: string | null;
  negatives: string[];
}

export function getSubjectSpecificGuidance(prompt: string): SubjectGuidance {
  const clean = cleanConversationalNoise(prompt).toLowerCase();

  // 1. Aeroplane / Airplane
  if (/\b(aeroplane|airplane|aircraft|jetliner|passenger plane)\b/i.test(clean)) {
    return {
      guidance: "Aeroplane Subject Guidance: Render one clearly recognizable conventional aeroplane with a physically plausible airframe, symmetrical wings, correctly attached tail surfaces, consistent engine placement, complete aircraft visible unless close-up requested, natural sky and atmospheric perspective, coherent camera angle, with no duplicated or melted parts",
      negatives: ["malformed wings", "mismatched engines", "asymmetrical airframe", "floating aircraft parts", "extra wings", "distorted tail", "melted jet engines"]
    };
  }

  // 2. Neuron
  if (/\b(neuron|synapse|neural cell|nerve cell)\b/i.test(clean)) {
    return {
      guidance: "Neuron Subject Guidance: Render one scientifically recognizable biological neuron showing a distinct soma (cell body), branching dendrites radiating naturally from the soma, a single clear axon, and axon terminals, with biologically plausible proportions and clean structural composition",
      negatives: ["human head", "human face", "brain sculpture", "tree trunk", "fantasy character", "glowing head silhouette", "artistic statue", "surreal branches", "head sculpture"]
    };
  }

  // 3. Mountain
  if (/\b(mountain|alpine peak|mountain range|mountain landscape)\b/i.test(clean)) {
    return {
      guidance: "Mountain Subject Guidance: Render one clearly recognizable natural mountain with coherent geological rock and ridge structure, realistic mountain terrain and elevation, realistic depth and atmospheric perspective, sharp mountain peak focal point",
      negatives: ["folded cloth", "fabric texture", "melted terrain", "artificial cloth folds", "plastic landscape", "distorted geology"]
    };
  }

  return { guidance: null, negatives: [] };
}

export function getStyleGuidance(styleOrCategory?: string): string | null {
  if (!styleOrCategory) return null;
  const key = styleOrCategory.trim().toLowerCase().replace(/[\s_-]+/g, "");

  switch (key) {
    case "realistic":
      return "PHOTOREALISTIC STYLE: Photorealistic photograph, natural lighting, high level of detail, realistic camera focus";
    case "anime":
      return "ANIME STYLE: Vibrant high quality Japanese anime illustration, clean line art, cel shading";
    case "3d":
    case "3drender":
      return "3D RENDER STYLE: 3D Octane render, volumetric lighting, smooth material textures";
    case "cartoon":
      return "CARTOON STYLE: Clean colorful cartoon illustration, bold outlines, vector style artwork";
    case "digitalart":
      return "DIGITAL ART STYLE: Masterpiece digital concept artwork, rich detailed composition";
    case "sketch":
      return "SKETCH STYLE: Detailed hand-drawn pencil sketch, architectural line art, clean shading";
    case "painting":
      return "PAINTING STYLE: Classic textured oil painting, rich canvas brushstrokes, artistic color palette";
    case "cinematic":
      return "CINEMATIC STYLE: Cinematic movie still frame, dramatic lighting, depth of field";
    case "diagram":
      return "DIAGRAM STYLE: Clean labeled educational diagram, vector infographic layout";
    default:
      return null;
  }
}

// ============================================================================
// LAYER 5: NEGATIVE CONSTRAINT BUILDER
// ============================================================================

/**
 * Builds safe, category-aware, prompt-aware negative constraints array.
 * Never prohibits the chosen category or explicit user requirements.
 */
export function buildNegativeConstraints(
  category?: ImageCategory,
  isScientific: boolean = false,
  prompt?: string
): string[] {
  const clean = cleanConversationalNoise(prompt || "");
  const subjectGuidance = getSubjectSpecificGuidance(clean);
  const p = (prompt || "").toLowerCase();

  // Baseline safe quality constraints
  const constraints = new Set<string>([
    "accidental duplicate elements",
    "unintentional distortion",
    "incorrect component connections",
    "unreadable text artifacts",
    "unrequested watermarks",
    "unintentional visual noise",
    "blurry details",
  ]);

  if (subjectGuidance.negatives.length > 0) {
    for (const neg of subjectGuidance.negatives) {
      constraints.add(neg);
    }
  }

  // Add category-specific negatives ONLY when they don't conflict with prompt or category
  if (category !== "Portrait" && !/\b(portrait|face|person|human|character)\b/i.test(p) && !/\bneuron\b/i.test(p)) {
    constraints.add("unintentional human faces");
  }

  if (category !== "Artistic Illustration" && !/\b(fantasy|surreal|abstract)\b/i.test(p)) {
    constraints.add("unrequested fantasy transformations");
  }

  if (isScientific) {
    constraints.add("incorrect structural relationships");
    constraints.add("misplaced requested annotations");

    // Only add dark/3D negatives if user did NOT explicitly request them
    if (!/\b(dark|black|night)\s+background\b/i.test(p) && !/\bon\s+a\s+black\b/i.test(p)) {
      constraints.add("unintended dark background");
    }
    if (!/\b(3d|three-dimensional|3d model|3d render|cgi|sculpture)\b/i.test(p)) {
      constraints.add("unintended 3D CGI depth");
    }
  }

  if (category === "Product Image" && !/\b(hand|holding|hands)\b/i.test(p)) {
    constraints.add("unintended human hands");
  }

  return Array.from(constraints);
}

// ============================================================================
// LAYER 6: QUALITY NORMALIZER & CATEGORY-SPECIFIC PROMPT BUILDERS
// ============================================================================

export function normalizeQualityMode(qualityInput?: string): ImageQualityMode {
  if (!qualityInput || typeof qualityInput !== "string") {
    return "balanced";
  }
  const clean = qualityInput.trim().toLowerCase();
  if (clean === "hd") return "hd";
  if (clean === "fast") return "fast";
  return "balanced";
}

/**
 * Constructs scientific prompts while preserving all user constraints.
 */
export function buildScientificPrompt(
  prompt: string,
  quality: ImageQualityMode = "balanced",
  retryLevel: 0 | 1 = 0,
  styleHint?: string
): string {
  const cleanPrompt = (prompt || "").trim();
  const labelIntent = detectLabelIntent(cleanPrompt);
  const baseSubject = cleanConversationalNoise(cleanPrompt);
  const subjectGuidance = getSubjectSpecificGuidance(baseSubject);

  const qualitySuffix = quality === "hd"
    ? ", high structural precision, publication quality detail"
    : quality === "fast"
      ? ", clean clear layout"
      : ", detailed educational composition";

  let labelGuidance = "";
  if (labelIntent === "required") {
    labelGuidance = " Render requested labels as clearly and accurately as the image model allows.";
  } else if (labelIntent === "forbidden") {
    labelGuidance = " Do NOT include any text labels or annotations.";
  }

  const modeHeader = retryLevel === 1
    ? `HIGH ACCURACY SCIENTIFIC ENFORCEMENT [LEVEL 1 RETRY]: Prioritize structural accuracy, correct relationships, and exact prompt adherence`
    : `HIGH ACCURACY SCIENTIFIC MODE: Scientifically accurate textbook quality rendering`;

  let parts: string[] = [modeHeader + `${labelGuidance}${qualitySuffix}.`];

  if (subjectGuidance.guidance) {
    parts.push(subjectGuidance.guidance + ".");
  }

  parts.push(`User Request: "${cleanPrompt}"`);
  return parts.join(" ");
}

/**
 * Non-scientific category-specific prompt builder (Requirement 7).
 */
function buildNonScientificPrompt(
  prompt: string,
  category: ImageCategory,
  quality: ImageQualityMode,
  styleHint?: string
): string {
  const cleanPrompt = (prompt || "").trim();
  const baseSubject = cleanConversationalNoise(cleanPrompt);
  const subjectGuidance = getSubjectSpecificGuidance(baseSubject);
  const styleGuidance = getStyleGuidance(styleHint || category);

  const qualitySuffix = quality === "hd"
    ? ", high resolution, fine detail"
    : quality === "fast"
      ? ", clean rendering"
      : ", detailed composition";

  let parts: string[] = [];

  if (styleGuidance) {
    parts.push(styleGuidance + ".");
  }

  if (subjectGuidance.guidance) {
    parts.push(subjectGuidance.guidance + ".");
  } else {
    switch (category) {
      case "Architecture":
        parts.push(`ARCHITECTURAL DESIGN GUIDANCE: Focus on structural proportions, clean perspective, and requested architectural view${qualitySuffix}.`);
        break;

      case "Product Image":
        parts.push(`PRODUCT IMAGE GUIDANCE: Focus on product form, material textures, accurate branding, and requested environment or lighting${qualitySuffix}.`);
        break;

      case "Portrait":
        parts.push(`PORTRAIT GUIDANCE: Focus on subject facial traits, expression, posture, framing, and requested artistic medium or lighting${qualitySuffix}.`);
        break;

      case "Artistic Illustration":
        parts.push(`ARTISTIC ILLUSTRATION GUIDANCE: Focus on requested artistic medium, composition, palette, texture, and mood${qualitySuffix}.`);
        break;

      case "General Image":
      default:
        parts.push(`IMAGE GENERATION GUIDANCE: High quality rendering matching all user specifications${qualitySuffix}.`);
        break;
    }
  }

  parts.push(`User Request: "${cleanPrompt}"`);
  return parts.join(" ");
}

// ============================================================================
// LAYER 7: PROMPT VALIDATION & AUDITING
// ============================================================================

/**
 * Audits the generated text prompt for structural completeness and hardcoded conflicts.
 * Note: validatePrompt audits text prompt formatting only. It cannot inspect
 * rendered pixel output, OCR accuracy, or model visual compliance.
 */
export function validatePrompt(
  originalPrompt: string,
  enhancedPrompt: string,
  isScientific: boolean,
  preserved: PreservedElements
): PromptValidationResult {
  const warnings: string[] = [];
  const lowerOriginal = (originalPrompt || "").toLowerCase();
  const lowerEnhanced = (enhancedPrompt || "").toLowerCase();

  // 1. Verify complete original prompt is present verbatim
  const objectPreserved = lowerEnhanced.includes(lowerOriginal);
  if (!objectPreserved) {
    warnings.push("Original request text is not fully preserved in the enhanced prompt.");
  }

  // 2. Diagram check
  const isDiagramInOriginal = /\b(diagram|schematic|flowchart|cross-section)\b/i.test(lowerOriginal);
  const diagramRequested = !isDiagramInOriginal || lowerEnhanced.includes("diagram") || lowerEnhanced.includes("schematic");

  // 3. Label intent consistency check
  const labelIntent = detectLabelIntent(originalPrompt);
  let labelsRequired = true;
  if (labelIntent === "required" && lowerEnhanced.includes("do not include any text labels")) {
    labelsRequired = false;
    warnings.push("Hardcoded conflict: User requested labels but prompt forbade them.");
  } else if (labelIntent === "forbidden" && lowerEnhanced.includes("render requested labels")) {
    labelsRequired = false;
    warnings.push("Hardcoded conflict: User forbade labels but prompt requested them.");
  }

  // 4. Background consistency check
  let backgroundSpecified = true;
  if (/\b(black|dark)\s+background\b/i.test(lowerOriginal) && lowerEnhanced.includes("white background")) {
    backgroundSpecified = false;
    warnings.push("Hardcoded conflict: Black background requested but white background was added.");
  }

  // 5. Hardcoded style conflicts
  let styleSpecified = true;
  if (/\bmonochrome\b/i.test(lowerOriginal) && lowerEnhanced.includes("vivid colors")) {
    styleSpecified = false;
    warnings.push("Hardcoded conflict: Monochrome requested but vivid colors added.");
  }
  if (/\b3d\b/i.test(lowerOriginal) && lowerEnhanced.includes("flat 2d")) {
    styleSpecified = false;
    warnings.push("Hardcoded conflict: 3D requested but flat 2D forced.");
  }

  const forbiddenTermsRemoved = !/\b(sculpture|surreal|cosplay|neon glow)\b/i.test(enhancedPrompt) ||
    /\b(sculpture|surreal|cosplay|neon glow)\b/i.test(lowerOriginal);

  let score = 100;
  if (!objectPreserved) score -= 30;
  if (!diagramRequested) score -= 15;
  if (!labelsRequired) score -= 25;
  if (!backgroundSpecified) score -= 20;
  if (!styleSpecified) score -= 20;
  if (!forbiddenTermsRemoved) score -= 10;

  score = Math.max(0, score);

  return {
    isValid: score >= 70,
    objectPreserved,
    diagramRequested,
    labelsRequired,
    backgroundSpecified,
    styleSpecified,
    forbiddenTermsRemoved,
    score,
    warnings,
  };
}

// ============================================================================
// MAIN ENTRY POINT: PROCESS SMART IMAGE ROUTING
// ============================================================================

/**
 * Main Smart Image Routing & Prompt Enforcement function.
 * Throws TypeError if prompt is empty or whitespace-only.
 */
export function processSmartImageRouting(
  prompt: string,
  userCategoryHint?: string,
  qualityInput: string = "balanced",
  retryLevel: 0 | 1 = 0
): SmartRoutingResult {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new TypeError("Prompt must be a non-empty string.");
  }

  const cleanPrompt = prompt.trim();
  const qualityMode = normalizeQualityMode(qualityInput);

  // Step 1: Category Classification with scoring and hints
  const classification = classifyCategoryWithScoring(cleanPrompt, userCategoryHint);
  const category = classification.category;

  // Step 2: Scientific Mode Determination (Strictly linked to final category)
  const scientificMode = SCIENTIFIC_CATEGORIES.has(category);

  // Step 3: Extract Preserved Elements Metadata
  const preservedElements = extractPreservedElements(cleanPrompt);

  // Step 4: Build Safe Negative Constraints
  const negativeConstraints = buildNegativeConstraints(category, scientificMode, cleanPrompt);
  const negativeConstraintsText = negativeConstraints.join(", ");

  // Step 5: Build Enhanced Prompt
  let enhancedPrompt = "";
  if (scientificMode) {
    enhancedPrompt = buildScientificPrompt(cleanPrompt, qualityMode, retryLevel, userCategoryHint);
  } else {
    enhancedPrompt = buildNonScientificPrompt(cleanPrompt, category, qualityMode, userCategoryHint);
  }

  // Step 6: Validate Prompt String
  const validation = validatePrompt(cleanPrompt, enhancedPrompt, scientificMode, preservedElements);

  // Step 7: Retry Configuration (retryPrompt ONLY defined for scientific categories)
  const retryPrompt = scientificMode
    ? buildScientificPrompt(cleanPrompt, qualityMode, 1)
    : undefined;
  const retryRecommended = scientificMode && !validation.isValid;

  // Step 8: Enforcement Level
  const enforcementLevel: EnforcementLevel = scientificMode
    ? "strict"
    : category === "Artistic Illustration"
      ? "creative"
      : "standard";

  return {
    category,
    confidence: classification.confidence,
    scientificMode,
    isScientificMode: scientificMode,
    isHighAccuracyScientificMode: scientificMode,
    enhancedPrompt,
    negativeConstraints,
    negativeConstraintsText,
    qualityMode,
    retryRecommended,
    retryPrompt,
    validation,
    enforcementLevel,
    preservedElements,
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES & EXPORTS
// ============================================================================

export const routeSmartImage = processSmartImageRouting;

export function isScientificModeTriggered(prompt: string, category: ImageCategory): boolean {
  return SCIENTIFIC_CATEGORIES.has(category);
}
