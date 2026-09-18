export type Product = {
  registrationNumber: string;
  tradeName: string;
  registrant: string;
  status: string;
  productTypes: string[];
  activeIngredients: string[];
  registrationDate: string | null;
  nzAgent: string | null;
  raw: Record<string, string>[];
};

export type SignalEvent = {
  id?: number;
  eventType: string;
  registrationNumber: string;
  tradeName: string;
  registrant: string;
  detectedAt: string;
  summary: string;
  payload?: Record<string, unknown>;
};
