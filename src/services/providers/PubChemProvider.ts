import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { safeFetch } from "../../utils/visualHelpers";

export class PubChemProvider extends BaseProvider {
  id: ProviderId = "pubchem";
  name = "PubChem Chemical Structure Database";

  supports(intent: VisualIntent): boolean {
    return intent === "chemistry";
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    const compoundName = query.trim().replace(/^chemical structure of\s+/i, "").replace(/^molecule of\s+/i, "");
    if (!compoundName) return null;

    const encodedName = encodeURIComponent(compoundName);
    const pngUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodedName}/PNG?image_size=500x500`;

    try {
      // Perform HEAD/GET check to ensure compound exists
      const checkResp = await safeFetch(pngUrl, { method: "HEAD" });
      if (!checkResp.ok) {
        return null;
      }

      const formattedTitle = compoundName.charAt(0).toUpperCase() + compoundName.slice(1);

      return {
        id: `pubchem_${encodedName.toLowerCase()}`,
        provider: "pubchem",
        intent: "chemistry",
        type: "image",
        title: `${formattedTitle} Chemical Structure`,
        description: `2D Molecular structure diagram for ${formattedTitle} from PubChem NIH database.`,
        url: pngUrl,
        thumbnailUrl: pngUrl,
        source: "PubChem (NIH National Library of Medicine)",
        sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodedName}`,
        license: "Public Domain (US Government Work)",
        author: "National Center for Biotechnology Information (NCBI)"
      };
    } catch (err: any) {
      console.warn("[PubChemProvider] Compound lookup failed:", err?.message || err);
      return null;
    }
  }
}
