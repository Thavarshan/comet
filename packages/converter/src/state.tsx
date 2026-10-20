import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { acceptQueueSnapshot, type ConversionQueue } from '@honeymelon/core';
import type { Capabilities } from '@honeymelon/contracts';
import type { ConverterPlatform, ConverterPreferences } from './platform.js';

/** Shared queue state is a view; the injected service owns scheduling. */
export interface ConverterState {
  queue: ConversionQueue;
  capabilities?: Capabilities;
  phase: 'loading' | 'ready' | 'error';
  error?: string | undefined;
}

type Action =
  | { type: 'queue'; queue: ConversionQueue }
  | { type: 'ready'; capabilities: Capabilities }
  | { type: 'loading' }
  | { type: 'failure'; error: string }
  | { type: 'error'; error?: string };

export const initialConverterState: ConverterState = {
  queue: { revision: -1, jobs: [], batches: [] },
  phase: 'loading',
};

/** Ignore stale snapshots without duplicating engine lifecycle decisions. */
export function converterReducer(
  state: ConverterState,
  action: Action,
): ConverterState {
  switch (action.type) {
    case 'queue': {
      const queue = acceptQueueSnapshot(state.queue, action.queue);

      return queue === state.queue ? state : { ...state, queue };
    }

    case 'ready':
      return { ...state, phase: 'ready', capabilities: action.capabilities };
    case 'loading':
      return { ...initialConverterState, phase: 'loading' };
    case 'failure':
      return { ...state, phase: 'error', error: action.error };
    case 'error':
      return { ...state, error: action.error };
  }
}

interface ConverterContextValue extends ConverterState {
  platform: ConverterPlatform;
  preferences: ConverterPreferences;
  updatePreferences(
    change: (previous: ConverterPreferences) => ConverterPreferences,
  ): Promise<void>;
  report(error: unknown): void;
  dismiss(): void;
  retry(): void;
  acceptSnapshot(queue: ConversionQueue): void;
}

const ConverterContext = createContext<ConverterContextValue | null>(null);

/**
 * Subscribe before loading the initial snapshot, including under Strict Mode.
 * Hosts own service lifetime; an effect cleanup never stops submitted work.
 */
export function ConverterProvider({
  platform,
  preferences,
  onPreferencesChange,
  children,
}: {
  platform: ConverterPlatform;
  preferences: ConverterPreferences;
  onPreferencesChange(next: ConverterPreferences): Promise<void>;
  children: ReactNode;
}): ReactElement {
  const [state, dispatch] = useReducer(converterReducer, initialConverterState);
  const [attempt, setAttempt] = useState(0);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  const report = useCallback((error: unknown) => {
    dispatch({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }, []);
  const acceptSnapshot = useCallback((queue: ConversionQueue) => {
    dispatch({ type: 'queue', queue });
  }, []);
  useEffect(() => {
    let disposed = false;
    dispatch({ type: 'loading' });
    let unsubscribe = () => {};

    async function initialize() {
      try {
        unsubscribe = platform.service.subscribe((queue) => {
          if (!disposed) {
            acceptSnapshot(queue);
          }
        });
        const [capabilities, queue] = await Promise.all([
          platform.service.discoverCapabilities(),
          platform.service.getSnapshot(),
        ]);
        if (!disposed) {
          acceptSnapshot(queue);
          dispatch({ type: 'ready', capabilities });
        }
      } catch (error) {
        if (!disposed) {
          dispatch({
            type: 'failure',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void initialize();

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [platform, attempt, acceptSnapshot]);
  const updatePreferences = useCallback(
    async (
      change: (previous: ConverterPreferences) => ConverterPreferences,
    ) => {
      const next = change(structuredClone(preferencesRef.current));
      preferencesRef.current = next;
      try {
        await onPreferencesChange(next);
      } catch (error) {
        report(error);
      }
    },
    [onPreferencesChange, report],
  );

  return (
    <ConverterContext.Provider
      value={{
        ...state,
        platform,
        preferences,
        updatePreferences,
        report,
        acceptSnapshot,
        dismiss: () => dispatch({ type: 'error' }),
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </ConverterContext.Provider>
  );
}

/** Read the injected conversion workflow, failing clearly outside its host. */
export function useConverter(): ConverterContextValue {
  const context = useContext(ConverterContext);
  if (!context) {
    throw new Error('ConverterProvider required');
  }

  return context;
}
