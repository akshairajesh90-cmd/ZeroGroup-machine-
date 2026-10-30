/**
 * Kerala Rural Geocoding & Anchor-Based Address Parser
 * Designed for high-range panchayats (Poonjar, Kottayam, Idukki borders)
 */

export interface ParsedKeralaLocation {
  rawInput: string;
  broadTown: string | null;
  subLocality: string | null;
  structuralAnchor: string | null;
  isAmbiguous: boolean;
  warningMessage?: string;
  normalizedAddress: string;
}

// Known broad panchayats spanning large geographical areas (>20 - 40 sq km)
export const BROAD_KERALA_PANCHAYATS: Record<string, { name: string; approxAreaSqKm: number; sampleWards: string[] }> = {
  poonjar: {
    name: "Poonjar",
    approxAreaSqKm: 38,
    sampleWards: ["Panackapalam", "Erumapra", "Adivaram", "Perunilam", "Thekkekara", "Vadakkekara"],
  },
  teekoy: {
    name: "Teekoy",
    approxAreaSqKm: 32,
    sampleWards: ["Mankombu", "Vellikulam", "Aanikkadu", "Mangalagiri"],
  },
  melukavu: {
    name: "Melukavu",
    approxAreaSqKm: 28,
    sampleWards: ["Melukavumattom", "Kollappally", "Konnakkad"],
  },
  erattupetta: {
    name: "Erattupetta",
    approxAreaSqKm: 22,
    sampleWards: ["Nadakkal", "Aruvithura", "Thekkekara", "Vattakkulam"],
  },
  mundakkayam: {
    name: "Mundakkayam",
    approxAreaSqKm: 42,
    sampleWards: ["Punchavayal", "Vandiperiyar Road", "Yendayar", "Koottickal"],
  },
  kanjirappally: {
    name: "Kanjirappally",
    approxAreaSqKm: 35,
    sampleWards: ["Anakkallu", "Thampalakkadu", "Mannarakkayam"],
  },
  pala: {
    name: "Pala",
    approxAreaSqKm: 18,
    sampleWards: ["Mutholy", "Lalam", "Kannadiurumpu", "Puliyannoor"],
  },
};

// Structural micro-anchor keywords commonly found in rural Kerala
const ANCHOR_PATTERNS = [
  /(?:near|opposite|opp|adj|beside|behind|close to|next to)\s+([^,]+)/i,
  /([^,]+(?:\s+bridge|\s+palam|\s+kavala|\s+junction|\s+jn|\s+temple|\s+ambalam|\s+church|\s+palli|\s+mosque|\s+masjid|\s+school|\s+ration\s*(?:shop|kada)|\s+post\s*office|\s+estate\s*gate|\s+quarry))/i,
  /(ration\s*(?:shop|kada)\s*(?:#?\s*\d+|no\s*\d+)?)/i,
];

// Sub-locality keywords and suffixes
const SUB_LOCALITY_PATTERNS = [
  /\b(panackapalam|erumapra|adivaram|perunilam|mankombu|vellikulam|melukavumattom|nadakkal|aruvithura|kattachira|kollappally|punchavayal|yendayar|anakkallu|thampalakkadu|mutholy)\b/i,
  /\b([a-z]+(?:kkadu|para|palam|kavala|pally|thodu|mala|kunnu|muri|ward\s*\d+))\b/i,
];

/**
 * Parses raw text input into a two-layer hierarchy:
 * Layer 1: Sub-locality / Ward
 * Layer 2: Structural Micro-Anchor
 *
 * If a broad panchayat is entered with no sub-locality or anchor,
 * generates a high-visibility warning to prevent rural logistics failures.
 */
export function parseKeralaLocation(input: string): ParsedKeralaLocation {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return {
      rawInput: "",
      broadTown: null,
      subLocality: null,
      structuralAnchor: null,
      isAmbiguous: true,
      warningMessage: "Location cannot be empty.",
      normalizedAddress: "",
    };
  }

  const lower = trimmed.toLowerCase();

  // 1. Identify if a broad high-range panchayat is mentioned
  let matchedBroadTown: string | null = null;
  let broadMeta: { name: string; approxAreaSqKm: number; sampleWards: string[] } | null = null;

  for (const [key, meta] of Object.entries(BROAD_KERALA_PANCHAYATS)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(lower)) {
      matchedBroadTown = meta.name;
      broadMeta = meta;
      break;
    }
  }

  // 2. Extract Structural Micro-Anchor
  let extractedAnchor: string | null = null;
  for (const pattern of ANCHOR_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      extractedAnchor = match[1].trim();
      break;
    }
  }

  // 3. Extract Sub-Locality / Ward
  let extractedSubLocality: string | null = null;
  for (const pattern of SUB_LOCALITY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Don't duplicate if anchor already contains it
      if (!extractedAnchor || !extractedAnchor.toLowerCase().includes(candidate.toLowerCase())) {
        extractedSubLocality = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        break;
      }
    }
  }

  // 4. Ambiguity Evaluation
  let isAmbiguous = false;
  let warningMessage: string | undefined;

  if (matchedBroadTown && broadMeta) {
    // If user typed only the broad panchayat or no landmark anchor is specified
    const hasSpecificDetails = extractedSubLocality || extractedAnchor || trimmed.split(",").length >= 2;
    if (!hasSpecificDetails || trimmed.length <= matchedBroadTown.length + 3) {
      isAmbiguous = true;
      const sampleSuggestions = broadMeta.sampleWards.slice(0, 3).join(", ");
      warningMessage = `⚠️ High-Range Panchayat Ambiguity: "${matchedBroadTown}" covers >${broadMeta.approxAreaSqKm} km². Please specify Sub-locality/Ward (e.g. ${sampleSuggestions}) and Landmark Anchor (e.g. Bridge, Temple, Ration Shop).`;
    }
  }

  // 5. Build Normalized Address
  const addressParts: string[] = [];
  if (extractedSubLocality) addressParts.push(extractedSubLocality);
  if (extractedAnchor) addressParts.push(extractedAnchor);
  if (matchedBroadTown && !addressParts.includes(matchedBroadTown)) addressParts.push(matchedBroadTown);
  if (addressParts.length === 0) addressParts.push(trimmed);

  return {
    rawInput: trimmed,
    broadTown: matchedBroadTown,
    subLocality: extractedSubLocality,
    structuralAnchor: extractedAnchor,
    isAmbiguous,
    warningMessage,
    normalizedAddress: addressParts.join(", "),
  };
}
