import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  locales,
  unwrap,
  type Environment,
  type Preferences,
  type QueueSnapshot,
  type Theme,
} from '@comet/contracts';
import i18n from './i18n';

interface State {
  queue: QueueSnapshot;
  preferences?: Preferences;
  environment?: Environment;
  phase: 'loading' | 'ready' | 'error';
  error?: string | undefined;
}
type Action =
  | { type: 'queue'; queue: QueueSnapshot }
  | { type: 'ready'; preferences: Preferences; environment: Environment }
  | { type: 'preferences'; preferences: Preferences }
  | { type: 'systemTheme'; theme: 'light' | 'dark' }
  | { type: 'phase'; phase: State['phase'] }
  | { type: 'error'; error?: string };

export const initialState: State = {
  queue: { revision: -1, jobs: [], batches: [] },
  phase: 'loading',
};

/**
 * Apply queue revisions monotonically and keep UI-only state independent.
 */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'queue':
      return action.queue.revision > state.queue.revision
        ? { ...state, queue: action.queue }
        : state;
    case 'ready':
      return {
        ...state,
        preferences: action.preferences,
        environment: action.environment,
        phase: 'ready',
        error: undefined,
      };
    case 'preferences':
      return { ...state, preferences: action.preferences };
    case 'systemTheme':
      return state.environment
        ? {
            ...state,
            environment: { ...state.environment, systemTheme: action.theme },
          }
        : state;
    case 'phase':
      return { ...state, phase: action.phase, error: undefined };
    case 'error':
      return { ...state, error: action.error };
  }
}

interface AppContextValue extends State {
  retry(): void;
  report(error: unknown): void;
  dismiss(): void;
  updatePreferences(
    change: (previous: Preferences) => Preferences,
  ): Promise<void>;
  acceptSnapshot(snapshot: QueueSnapshot): void;
}
const AppContext = createContext<AppContextValue | null>(null);

/**
 * Connect React to the bridge with Strict Mode-safe subscriptions.
 * Subscribe before fetching initial state to avoid losing queue updates.
 */
export function AppProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [attempt, setAttempt] = useState(0);
  const preferencesRef = useRef<Preferences | null>(null);
  const report = useCallback(
    (error: unknown) =>
      dispatch({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      }),
    [],
  );
  const acceptSnapshot = useCallback(
    (queue: QueueSnapshot) => dispatch({ type: 'queue', queue }),
    [],
  );
  useEffect(() => {
    let disposed = false;
    dispatch({ type: 'phase', phase: 'loading' });
    const unsubscribe = window.comet.onQueueChanged((queue) => {
      if (!disposed) {
        acceptSnapshot(queue);
      }
    });
    const unsubscribeTheme = window.comet.onThemeChanged((theme) => {
      if (!disposed) {
        dispatch({ type: 'systemTheme', theme });
      }
    });

    async function initialize() {
      try {
        const [environmentReply, preferencesReply, queueReply] =
          await Promise.all([
            window.comet.getEnvironment(),
            window.comet.getPreferences(),
            window.comet.getSnapshot(),
          ]);
        const environment = unwrap(environmentReply);
        let preferences = unwrap(preferencesReply);
        const queue = unwrap(queueReply);
        if (disposed) {
          return;
        }

        if (!preferences.legacyImported) {
          let locale: string | null = null;
          let theme: string | null = null;
          try {
            locale = localStorage.getItem('locale');
            theme = localStorage.getItem('color-mode');
          } catch {
            /* Storage may be unavailable; native preferences still work. */
          }

          preferences = unwrap(
            await window.comet.importLegacyPreferences({
              ...(locales.includes(locale as (typeof locales)[number])
                ? { locale: locale as (typeof locales)[number] }
                : {}),
              ...(['light', 'dark', 'system'].includes(theme ?? '')
                ? { theme: theme as Theme }
                : {}),
            }),
          );
        }

        await i18n.changeLanguage(preferences.locale);
        if (disposed) {
          return;
        }

        preferencesRef.current = preferences;
        acceptSnapshot(queue);
        dispatch({ type: 'ready', preferences, environment });
      } catch (error) {
        if (!disposed) {
          dispatch({ type: 'phase', phase: 'error' });
          report(error);
        }
      }
    }

    void initialize();

    return () => {
      disposed = true;
      unsubscribe();
      unsubscribeTheme();
    };
  }, [attempt, report, acceptSnapshot]);
  useEffect(() => {
    if (!state.preferences) {
      return;
    }

    const { locale, theme } = state.preferences;
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle(
      'dark',
      (theme === 'system' ? state.environment?.systemTheme : theme) === 'dark',
    );
    document.documentElement.style.colorScheme =
      theme === 'system' ? (state.environment?.systemTheme ?? 'light') : theme;
  }, [state.preferences, state.environment?.systemTheme]);
  const updatePreferences = useCallback(
    async (change: (previous: Preferences) => Preferences) => {
      if (!preferencesRef.current) {
        return;
      }

      const next = change(structuredClone(preferencesRef.current));
      preferencesRef.current = next;
      dispatch({ type: 'preferences', preferences: next });
      try {
        const saved = unwrap(await window.comet.savePreferences(next));
        if (preferencesRef.current === next) {
          preferencesRef.current = saved;
          dispatch({ type: 'preferences', preferences: saved });
        }
      } catch (error) {
        report(error);
      }
    },
    [report],
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        retry: () => setAttempt((value) => value + 1),
        report,
        dismiss: () => dispatch({ type: 'error' }),
        updatePreferences,
        acceptSnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * Read desktop state, failing clearly when the provider is missing.
 */
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('AppProvider required');
  }

  return context;
}
