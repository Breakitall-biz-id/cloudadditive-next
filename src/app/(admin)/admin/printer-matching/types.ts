export type MatchingOption = { id: string; name: string };

export type MatchingLabRow = {
  id: string;
  label: string;
  materialId: string;
  qualityId: string;
  quantity: number;
  latitude: number;
  longitude: number;
  address: string;
  width: number;
  depth: number;
  height: number;
  estimatedMinutes: number;
  fileName: string;
  qualityMode: "sliced" | "informational";
};
