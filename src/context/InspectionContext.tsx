import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { InspectionResult } from '../sdk/types';
import { deleteInspection, loadHistory, saveInspection } from '../utils/storage';

interface State {
  history: InspectionResult[];
  pendingResult: InspectionResult | null;
  loading: boolean;
}

type Action =
  | { type: 'SET_HISTORY'; payload: InspectionResult[] }
  | { type: 'ADD_RESULT'; payload: InspectionResult }
  | { type: 'REMOVE_RESULT'; payload: string }
  | { type: 'SET_PENDING'; payload: InspectionResult | null }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'ADD_RESULT':
      return { ...state, history: [action.payload, ...state.history] };
    case 'REMOVE_RESULT':
      return { ...state, history: state.history.filter((r) => r.id !== action.payload) };
    case 'SET_PENDING':
      return { ...state, pendingResult: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
  }
}

interface ContextValue extends State {
  addResult: (result: InspectionResult) => Promise<void>;
  removeResult: (id: string) => Promise<void>;
  setPendingResult: (result: InspectionResult | null) => void;
}

const InspectionContext = createContext<ContextValue | null>(null);

export function InspectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    history: [],
    pendingResult: null,
    loading: true,
  });

  useEffect(() => {
    loadHistory()
      .then((h) => dispatch({ type: 'SET_HISTORY', payload: h }))
      .catch(() => dispatch({ type: 'SET_HISTORY', payload: [] }))
      .finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
  }, []);

  const addResult = async (result: InspectionResult) => {
    await saveInspection(result);
    dispatch({ type: 'ADD_RESULT', payload: result });
  };

  const removeResult = async (id: string) => {
    await deleteInspection(id);
    dispatch({ type: 'REMOVE_RESULT', payload: id });
  };

  const setPendingResult = (result: InspectionResult | null) => {
    dispatch({ type: 'SET_PENDING', payload: result });
  };

  return (
    <InspectionContext.Provider value={{ ...state, addResult, removeResult, setPendingResult }}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection(): ContextValue {
  const ctx = useContext(InspectionContext);
  if (!ctx) throw new Error('useInspection must be used within InspectionProvider');
  return ctx;
}
