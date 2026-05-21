import { api } from '@/api/client';
import type { User } from '@/types';

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export const authApi = {
  login(input: LoginInput) {
    return api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
      auth: false,
    });
  },
  me() {
    return api<User>('/auth/me');
  },
};
