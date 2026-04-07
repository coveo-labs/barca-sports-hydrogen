import {
  type AgentRuntimeSelection,
  isAgentRuntimeSelection,
} from '~/lib/generative/agent-runtime';

export const FEATURE_SETTINGS_SESSION_KEY = 'barca_feature_settings_session';
export const FEATURE_SETTINGS_CHANGED_EVENT = 'featureSettingsChanged';

export interface FeatureSettings {
  agentRuntime: AgentRuntimeSelection;
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  agentRuntime: 'default',
};

export function normalizeFeatureSettings(value: unknown): FeatureSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_FEATURE_SETTINGS;
  }

  const candidate = value as Partial<FeatureSettings>;

  return {
    agentRuntime: isAgentRuntimeSelection(candidate.agentRuntime)
      ? candidate.agentRuntime
      : DEFAULT_FEATURE_SETTINGS.agentRuntime,
  };
}

export function getFeatureSettingsSnapshot(): FeatureSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_FEATURE_SETTINGS;
  }

  try {
    const sessionStored = sessionStorage.getItem(FEATURE_SETTINGS_SESSION_KEY);
    if (sessionStored) {
      return normalizeFeatureSettings(JSON.parse(sessionStored));
    }
  } catch (e) {
    console.error('Failed to load feature settings:', e);
  }

  return DEFAULT_FEATURE_SETTINGS;
}

export function saveFeatureSettings(settings: FeatureSettings) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(
      FEATURE_SETTINGS_SESSION_KEY,
      JSON.stringify(settings),
    );
  } catch (e) {
    console.error('Failed to save feature settings:', e);
  }
}

export function dispatchFeatureSettingsChanged(settings: FeatureSettings) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(FEATURE_SETTINGS_CHANGED_EVENT, {detail: settings}),
  );
}
