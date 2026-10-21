import { createContext, useContext } from "react";

export const AuthUserContext = createContext(null);

export function useAuthUser() {
  return useContext(AuthUserContext);
}
