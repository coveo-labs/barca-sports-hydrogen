export const AGENT_SELECTION_HEADER = 'X-Barca-Agent-Selection';
export const COVEO_FEATURE_FLAG_OVERRIDE_HEADER =
  'X-Coveo-Feature-Flags-Overrides';
export const DEMO_AGENT_CORE_RUNTIME_FLAG = 'use-demo-agent-core-runtime';

export const AGENT_RUNTIME_OPTIONS = [
  'default',
  'nrf-demo-agent',
  'agent-smith-commerce-agent',
] as const;

export type AgentRuntimeSelection = (typeof AGENT_RUNTIME_OPTIONS)[number];

export function isAgentRuntimeSelection(
  value: unknown,
): value is AgentRuntimeSelection {
  if (typeof value !== 'string') {
    return false;
  }

  return AGENT_RUNTIME_OPTIONS.includes(
    value.trim() as AgentRuntimeSelection,
  );
}

export function normalizeAgentRuntimeSelection(
  value: unknown,
): AgentRuntimeSelection {
  return isAgentRuntimeSelection(value)
    ? (value.trim() as AgentRuntimeSelection)
    : 'default';
}

export function getFeatureFlagOverridesForAgentRuntime(
  selection: AgentRuntimeSelection,
): Record<string, boolean> | null {
  switch (selection) {
    case 'nrf-demo-agent':
      return {[DEMO_AGENT_CORE_RUNTIME_FLAG]: true};
    case 'default':
    case 'agent-smith-commerce-agent':
    default:
      return null;
  }
}
