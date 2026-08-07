import { InfographicTemplate } from "./types";

export const brainTemplate: InfographicTemplate = {
  id: "human-brain-anatomy",
  topicKeys: [
    "brain",
    "human brain",
    "brain diagram",
    "brain anatomy",
    "lobes of the brain",
    "cerebrum",
    "brain structure",
    "neuroanatomy"
  ],
  title: "HUMAN BRAIN ANATOMY & FUNCTIONAL LOBES",
  subtitle: "NEUROANATOMICAL STRUCTURE & CEREBRAL REGION FUNCTIONS OVERVIEW",
  baseIllustration: "/assets/diagrams/brain-base.png",
  regions: [
    {
      name: "Frontal Lobe",
      color: "#ef4444",
      side: "left",
      calloutPosition: { x: 26, y: 32 },
      bullets: [
        "Controls executive functions, decision making & reasoning",
        "Houses primary motor cortex regulating voluntary movement",
        "Contains Broca's area for speech production & syntax",
        "Manages emotional regulation, impulse control & personality",
        "Oversees working memory, focus & goal-directed planning"
      ]
    },
    {
      name: "Temporal Lobe",
      color: "#06b6d4",
      side: "left",
      calloutPosition: { x: 35, y: 56 },
      bullets: [
        "Processes auditory sensory input & acoustic frequencies",
        "Contains Wernicke's area for language comprehension",
        "Houses hippocampus for long-term memory consolidation",
        "Encodes complex visual memories & object recognition",
        "Regulates emotional responses via connection to amygdala"
      ]
    },
    {
      name: "Brain Stem",
      color: "#f59e0b",
      side: "left",
      calloutPosition: { x: 44, y: 78 },
      bullets: [
        "Composed of midbrain, pons & medulla oblongata",
        "Controls autonomic cardiac rhythm & vasomotor pressure",
        "Regulates automatic respiratory drive & swallowing",
        "Oversees reticular activating system for sleep & wakefulness",
        "Routes motor & sensory nerve pathways to spinal cord"
      ]
    },
    {
      name: "Parietal Lobe",
      color: "#a855f7",
      side: "right",
      calloutPosition: { x: 64, y: 28 },
      bullets: [
        "Contains primary somatosensory cortex for body sensation",
        "Decodes tactile perception, pressure, temperature & pain",
        "Integrates spatial orientation, navigation & body awareness",
        "Processes mathematical calculation & spatial reasoning",
        "Coordinates hand-eye motor alignment with visual feedback"
      ]
    },
    {
      name: "Occipital Lobe",
      color: "#22c55e",
      side: "right",
      calloutPosition: { x: 75, y: 50 },
      bullets: [
        "Houses primary visual cortex (V1 / striate cortex)",
        "Processes color wavelength, visual motion, contrast & shapes",
        "Maps visual fields from contralateral retina inputs",
        "Determines spatial depth perception & visual boundaries",
        "Enables rapid face & visual pattern recognition"
      ]
    },
    {
      name: "Cerebellum",
      color: "#ec4899",
      side: "right",
      calloutPosition: { x: 64, y: 72 },
      bullets: [
        "Coordinates timing & fluidity of voluntary movements",
        "Maintains bodily balance, equilibrium & posture",
        "Fine-tunes motor precision & calibrates movement force",
        "Stores procedural motor memory (muscle memory skills)",
        "Contributes to cognitive rhythm & language timing"
      ]
    }
  ],
  footerCards: [
    {
      icon: "🧠",
      title: "Thinking & Memory",
      description: "Frontal lobe and hippocampus collaborate for high-level reasoning, decision making, and long-term memory storage."
    },
    {
      icon: "✋",
      title: "Sensation & Touch",
      description: "Parietal somatosensory cortex decodes tactile pressure, temperature, pain, and spatial orientation."
    },
    {
      icon: "👂",
      title: "Hearing & Language",
      description: "Temporal auditory cortex and Wernicke's area process speech comprehension, acoustic pitch, and sound."
    },
    {
      icon: "👁️",
      title: "Vision Processing",
      description: "Occipital visual cortex converts light signals into color, spatial motion, depth, and visual objects."
    },
    {
      icon: "🏃",
      title: "Balance & Movement",
      description: "Cerebellum fine-tunes motor execution, muscle memory skills, balance, and spatial coordination."
    },
    {
      icon: "🫀",
      title: "Autonomic Control",
      description: "Brain stem automatically governs vital life-support functions including heart rate, breathing, and reflexes."
    }
  ]
};
