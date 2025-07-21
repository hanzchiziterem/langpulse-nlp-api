export interface User {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  tokenVersion: number;
}

export type UserCreateInput = Omit<User, 'id' | 'verified' | 'tokenVersion'> & {
  password: string;
};