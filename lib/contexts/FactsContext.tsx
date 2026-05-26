"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";

export type Annotation = {
  text: string;
  editedFactText: string | null;
  createdAt: string;
};

export type FactWithAnnotations = {
  id: string;
  text: string;
  context: string;
  documentId: string;
  documentName: string;
  annotations: Annotation[];
};

type FactsState = {
  facts: FactWithAnnotations[];
  loading: boolean;
  error: string | null;
};

type FactsAction =
  | { type: "LOADING" }
  | { type: "LOADED"; facts: FactWithAnnotations[] }
  | { type: "ERROR"; message: string }
  | { type: "UPDATE_FACT"; fact: FactWithAnnotations }
  | { type: "REMOVE_FACT"; id: string };

function factsReducer(state: FactsState, action: FactsAction): FactsState {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: true, error: null };
    case "LOADED":
      return { facts: action.facts, loading: false, error: null };
    case "ERROR":
      return { ...state, loading: false, error: action.message };
    case "UPDATE_FACT":
      return {
        ...state,
        facts: state.facts.map((f) =>
          f.id === action.fact.id ? action.fact : f,
        ),
      };
    case "REMOVE_FACT":
      return {
        ...state,
        facts: state.facts.filter((f) => f.id !== action.id),
      };
  }
}

type FactsContextValue = {
  state: FactsState;
  loadFacts: (documentId?: string) => Promise<void>;
  updateFact: (fact: FactWithAnnotations) => void;
  deleteFact: (id: string) => Promise<void>;
};

const FactsContext = createContext<FactsContextValue | null>(null);

export function FactsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(factsReducer, {
    facts: [],
    loading: false,
    error: null,
  });

  async function loadFacts(documentId?: string): Promise<void> {
    dispatch({ type: "LOADING" });
    try {
      const url = documentId
        ? `/api/facts?documentId=${encodeURIComponent(documentId)}`
        : "/api/facts";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load facts");
      }
      const { facts } = (await response.json()) as {
        facts: FactWithAnnotations[];
      };
      dispatch({ type: "LOADED", facts });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load facts";
      dispatch({ type: "ERROR", message });
    }
  }

  function updateFact(fact: FactWithAnnotations): void {
    dispatch({ type: "UPDATE_FACT", fact });
  }

  async function deleteFact(id: string): Promise<void> {
    const response = await fetch(`/api/facts/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      throw new Error("Failed to delete fact");
    }
    dispatch({ type: "REMOVE_FACT", id });
  }

  return (
    <FactsContext.Provider value={{ state, loadFacts, updateFact, deleteFact }}>
      {children}
    </FactsContext.Provider>
  );
}

export function useFacts(): FactsContextValue {
  const context = useContext(FactsContext);
  if (!context) {
    throw new Error("useFacts must be used within a FactsProvider");
  }
  return context;
}
