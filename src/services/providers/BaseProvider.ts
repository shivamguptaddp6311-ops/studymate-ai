import { VisualProvider, ProviderId, VisualIntent, VisualResult, QuotaState } from "../../types/visual";
import { QuotaManager } from "../visual/QuotaManager";

export abstract class BaseProvider implements VisualProvider {
  abstract id: ProviderId;
  abstract name: string;

  abstract supports(intent: VisualIntent, topic: string): boolean;
  abstract search(query: string, intent: VisualIntent, options?: Record<string, any>): Promise<VisualResult | null>;

  async checkQuota(): Promise<QuotaState> {
    return QuotaManager.checkQuota(this.id);
  }
}
