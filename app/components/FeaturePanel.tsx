import {useState, useEffect} from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {XMarkIcon, Cog6ToothIcon} from '@heroicons/react/24/outline';
import {
  type AgentRuntimeSelection,
  isAgentRuntimeSelection,
} from '~/lib/generative/agent-runtime';

const FEATURE_SETTINGS_SESSION_KEY = 'barca_feature_settings_session';

interface FeatureSettings {
  agentRuntime: AgentRuntimeSelection;
}

const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  agentRuntime: 'default',
};

const AGENT_RUNTIME_CHOICES: Array<{
  value: AgentRuntimeSelection;
  label: string;
  description: string;
}> = [
  {
    value: 'default',
    label: 'Org Default - no override',
    description: 'Use the org default with no per-request override.',
  },
  {
    value: 'nrf-demo-agent',
    label: 'Demo Agent',
    description: 'Routes requests to demo-agent built for NRF.',
  },
  {
    value: 'agent-smith-commerce-agent',
    label: 'Agent Smith Commerce Agent',
    description:
      'Routes requests to agent-smith commerce-agent.',
  },
];

function normalizeFeatureSettings(value: unknown): FeatureSettings {
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

/**
 * Load feature settings from sessionStorage.
 */
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

/**
 * Save feature settings for the current browser session only.
 */
function saveFeatureSettings(settings: FeatureSettings) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(FEATURE_SETTINGS_SESSION_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save feature settings:', e);
  }
}

export function FeaturePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<FeatureSettings>(
    DEFAULT_FEATURE_SETTINGS,
  );

  useEffect(() => {
    setSettings(getFeatureSettingsSnapshot());
  }, []);

  const handleSettingChange = <K extends keyof FeatureSettings>(
    key: K,
    value: FeatureSettings[K],
  ) => {
    const newSettings = {...settings, [key]: value};
    setSettings(newSettings);
    saveFeatureSettings(newSettings);

    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('featureSettingsChanged', {detail: newSettings}),
      );
    }
  };

  return (
    <>
      {/* Floating Feature Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-indigo-400 p-1.5 text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 transition-colors"
        aria-label="Open feature panel"
      >
        <Cog6ToothIcon className="h-4 w-4" />
      </button>

      {/* Feature Drawer */}
      <Transition show={isOpen}>
        <Dialog onClose={setIsOpen} className="relative z-50">
          <TransitionChild
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <TransitionChild
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <DialogPanel className="pointer-events-auto w-screen max-w-md">
                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                      {/* Header */}
                      <div className="bg-gray-800 px-4 py-6 sm:px-6">
                        <div className="flex items-center justify-between">
                          <DialogTitle className="text-base font-semibold text-white">
                            Feature Switches
                          </DialogTitle>
                          <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                          >
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative flex-1 px-4 py-6 sm:px-6">
                        <div className="space-y-6">
                          <div>
                            <div className="mb-3">
                              <h3 className="text-sm font-medium text-gray-900">
                                Conversational Agent
                              </h3>
                              <p className="mt-1 text-xs text-gray-500">
                                Applies to conversational requests only. Uses a
                                per-request override on the dev org for the Coveo agentic
                                endpoint.
                              </p>
                            </div>
                            <div className="space-y-3">
                              {AGENT_RUNTIME_CHOICES.map((choice) => {
                                const isSelected =
                                  settings.agentRuntime === choice.value;

                                return (
                                  <button
                                    key={choice.value}
                                    type="button"
                                    onClick={() =>
                                      handleSettingChange(
                                        'agentRuntime',
                                        choice.value,
                                      )
                                    }
                                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                    aria-pressed={isSelected}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {choice.label}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                          {choice.description}
                                        </div>
                                      </div>
                                      <span
                                        className={`h-3 w-3 rounded-full ${
                                          isSelected
                                            ? 'bg-indigo-600'
                                            : 'bg-gray-300'
                                        }`}
                                      />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-6">
                            <p className="text-xs text-gray-500">
                              Agent selection is saved locally and is only intended
                              for local and dev-style testing.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

export function useFeatureSettings() {
  const [settings, setSettings] = useState<FeatureSettings>(
    DEFAULT_FEATURE_SETTINGS,
  );

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;

    // Load current settings from storage
    setSettings(getFeatureSettingsSnapshot());

    const handleSettingsChange = (event: CustomEvent<FeatureSettings>) => {
      setSettings(event.detail);
    };

    window.addEventListener(
      'featureSettingsChanged',
      handleSettingsChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'featureSettingsChanged',
        handleSettingsChange as EventListener,
      );
    };
  }, []);

  return settings;
}
