export type ProfileType = 'READ_ONLY' | 'FULL_ACCESS';

export type ScreenKey =
  | 'DASHBOARD'
  | 'WAREHOUSE'
  | 'PRODUCTS'
  | 'USERS'
  | 'HISTORY'
  | 'PROFILES';

export type ActionKey = 'CREATE' | 'EDIT' | 'INACTIVATE' | 'ACTIVATE' | 'VIEW';

export type ProfileDTO = {
  id: number;
  type: ProfileType;
  description: string;
  allowedScreens: ScreenKey[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileUpsertRequest = {
  type: ProfileType;
  description: string;
  allowedScreens: ScreenKey[];
  active?: boolean;
};
