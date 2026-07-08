export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
  status?: string;
}
