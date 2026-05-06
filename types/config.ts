import type { ModelConfigType } from "@/types/common";

export type ModelConfig = {
  id: string;
  type: ModelConfigType;
  name: string;
  baseUrl: string;
  apiKeyRef: string;
  model: string;
  voice: string | null;
  speed: number | null;
  extraParams: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateModelConfigInput = {
  type: ModelConfigType;
  name: string;
  baseUrl: string;
  apiKeyRef: string;
  model: string;
  voice?: string | null;
  speed?: number | null;
  extraParams?: string | null;
};

export type UpdateModelConfigInput = Partial<
  Omit<ModelConfig, "id" | "type" | "createdAt" | "updatedAt">
>;
