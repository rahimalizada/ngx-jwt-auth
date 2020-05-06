import { WithID } from './with-id.model';

export interface AuthData<T extends WithID<S>, S> {
  subject: T;
  token: string;
  refreshToken: string;
  roles: string[];
}
