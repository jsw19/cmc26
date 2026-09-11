import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { InspectionResult, InspectionSession } from '../sdk/types';
import { deleteInspection, deleteSession, loadHistory, loadSessions, saveSession, saveInspection, updateInspection } from '../utils/storage';

interface State {
  sessions: InspectionSession[];
  loadError: string | null;
  history: InspectionResult[];
  pendingResult: InspectionResult | null;
  loading: boolean;
}

type Action =
  | { type: 'SET_SESSIONS'; payload: InspectionSession[] }
  | { type: 'SAVE_SESSION'; payload: InspectionSession }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'REMOVE_SESSION'; payload: string }
  | { type: 'SET_HISTORY'; payload: InspectionResult[] }
  | { type: 'ADD_RESULT'; payload: InspectionResult }
  | { type: 'REMOVE_RESULT'; payload: string }
  | { type: 'UPDATE_RESULT'; payload: InspectionResult }
  | { type: 'SET_PENDING'; payload: InspectionResult | null }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SESSIONS': return { ...state, sessions: action.payload };
    case 'SAVE_SESSION': return { ...state, sessions: [action.payload, ...state.sessions.filter(s => s.id !== action.payload.id)] };
    case 'LOAD_ERROR': return { ...state, loadError: action.payload };
    case 'REMOVE_SESSION': return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload), history: state.history.filter(r => r.sessionId !== action.payload), pendingResult: state.pendingResult?.sessionId === action.payload ? null : state.pendingResult };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'ADD_RESULT':
      return { ...state, history: [action.payload, ...state.history] };
    case 'REMOVE_RESULT':
      return { ...state, history: state.history.filter((r) => r.id !== action.payload) };
    case 'UPDATE_RESULT':
      return { ...state, history: state.history.map((r) => r.id === action.payload.id ? action.payload : r) };
    case 'SET_PENDING':
      return { ...state, pendingResult: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
  }
}

interface ContextValue extends State {
  upsertSession: (session: InspectionSession) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  addResult: (result: InspectionResult) => Promise<void>;
  removeResult: (id: string) => Promise<void>;
  updateResult: (result: InspectionResult) => Promise<void>;
  setPendingResult: (result: InspectionResult | null) => void;
}

const InspectionContext = createContext<ContextValue | null>(null);

export function InspectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sessions: [],
    loadError: null,
    history: [],
    pendingResult: null,
    loading: true,
  });

  useEffect(() => {
    Promise.all([loadHistory(), loadSessions()])
      .then(([h, sessions]) => { dispatch({ type: 'SET_HISTORY', payload: h }); dispatch({ type: 'SET_SESSIONS', payload: sessions }); })
      .catch(() => dispatch({ type: 'LOAD_ERROR', payload: 'Could not load saved inspections. Restart the app to try again.' }))
      .finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
  }, []);

  const addResult = async (result: InspectionResult) => {
    await saveInspection(result);
    dispatch({ type: 'ADD_RESULT', payload: result });
  };

  const upsertSession = async (session: InspectionSession) => {
    await saveSession(session);
    dispatch({ type: 'SAVE_SESSION', payload: session });
  };

  const removeSession = async (id: string) => {
    await deleteSession(id);
    dispatch({ type: 'REMOVE_SESSION', payload: id });
  };

  const removeResult = async (id: string) => {
    const result = state.history.find(r => r.id === id);
    const session = state.sessions.find(s => s.id === result?.sessionId);
    if (session?.status === 'complete') await upsertSession({ ...session, status: 'draft' });
    await deleteInspection(id);
    dispatch({ type: 'REMOVE_RESULT', payload: id });
  };

  const updateResult = async (result: InspectionResult) => {
    await updateInspection(result);
    dispatch({ type: 'UPDATE_RESULT', payload: result });
  };

  const setPendingResult = (result: InspectionResult | null) => {
    dispatch({ type: 'SET_PENDING', payload: result });
  };

  return (
    <InspectionContext.Provider value={{ ...state, upsertSession, removeSession, addResult, removeResult, updateResult, setPendingResult }}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection(): ContextValue {
  const ctx = useContext(InspectionContext);
  if (!ctx) throw new Error('useInspection must be used within InspectionProvider');
  return ctx;
}
