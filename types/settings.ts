export type AppSettings = {
  defaultZhVisionConfigId: string | null;
  defaultEnVisionConfigId: string | null;
  defaultZhTtsConfigId: string | null;
  defaultEnTtsConfigId: string | null;
  playbackSpeed: number;
  pauseBetweenPages: number;
};

export type UpdateAppSettingsInput = Partial<AppSettings>;
