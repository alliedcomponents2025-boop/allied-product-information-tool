import { ProductFamily } from "./types";

export const familyLabels: Record<ProductFamily, string> = {
  inductors: "Inductors",
  common_mode_chokes: "Common Mode Chokes",
  transformers: "Transformers",
  lan_magnetics: "LAN Magnetics",
  connectors: "Connectors",
  other: "Other",
};

export const productStatusLabels = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
} as const;

export const syncStatusLabels = {
  pending: "Pending",
  synced: "Synced",
  error: "Error",
} as const;

export const familyTabOrder: ProductFamily[] = [
  "inductors",
  "common_mode_chokes",
  "transformers",
  "lan_magnetics",
  "connectors",
  "other",
];
