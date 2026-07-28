import {AGENT_RUNTIME, type AgentRuntimeId} from '~/lib/generative/agent-runtime';

export const FEATURE_SETTINGS_SESSION_KEY = 'barca_feature_settings_session';
export const FEATURE_SETTINGS_CHANGED_EVENT = 'featureSettingsChanged';

export interface FeatureSettings {
  agentRuntime: AgentRuntimeId;
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  agentRuntime: AGENT_RUNTIME,
};

export function getFeatureSettingsSnapshot(): FeatureSettings {
  return DEFAULT_FEATURE_SETTINGS;
}

export function saveFeatureSettings(_settings: FeatureSettings) {
  // No-op: agent selection is no longer configurable.
}

export function dispatchFeatureSettingsChanged(_settings: FeatureSettings) {
  // No-op: agent selection is no longer configurable.
}
