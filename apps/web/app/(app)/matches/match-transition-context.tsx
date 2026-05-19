"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type MatchNavCtxType = {
  navPending: boolean;
  setNavPending: (v: boolean) => void;
};

const MatchNavCtx = createContext<MatchNavCtxType>({
  navPending: false,
  setNavPending: () => {},
});

export function MatchNavProvider({ children }: { children: ReactNode }) {
  const [navPending, setRaw] = useState(false);
  const setNavPending = useCallback((v: boolean) => setRaw(v), []);
  return (
    <MatchNavCtx.Provider value={{ navPending, setNavPending }}>
      {children}
    </MatchNavCtx.Provider>
  );
}

export function useMatchNav() {
  return useContext(MatchNavCtx);
}
