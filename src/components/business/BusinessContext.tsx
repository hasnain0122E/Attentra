"use client";

import {
  createContext,
  useContext,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  ActiveBusiness,
} from "@/lib/business/context";

interface BusinessContextValue {
  business: ActiveBusiness | null;
}

const BusinessContext =
  createContext<BusinessContextValue | null>(
    null,
  );

interface BusinessProviderProps {
  business: ActiveBusiness | null;
  children: ReactNode;
}

export function BusinessProvider({
  business,
  children,
}: BusinessProviderProps) {
  return (
    <BusinessContext.Provider
      value={{
        business,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context =
    useContext(BusinessContext);

  if (!context) {
    throw new Error(
      "useBusiness must be used within BusinessProvider",
    );
  }

  return context;
}