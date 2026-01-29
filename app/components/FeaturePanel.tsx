import {useState, useEffect} from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {XMarkIcon, Cog6ToothIcon} from '@heroicons/react/24/outline';

const FEATURE_SETTINGS_KEY = 'barca_feature_settings';
const FEATURE_SETTINGS_SESSION_KEY = 'barca_feature_settings_session';

interface FeatureSettings {
  showAISummary: boolean;
}

/**
 * Parse URL query parameters for feature flags
 * Supports: ?features=ai-summary or ?features=ai-summary,other-feature
 */
function getFeatureSettingsFromURL(): Partial<FeatureSettings> | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const featuresParam = params.get('features') ?? params.get('feature');

    if (!featuresParam) return null;

    const features = featuresParam.split(',').map((feature) => feature.trim());
    const settings: Partial<FeatureSettings> = {};

    if (features.includes('ai-summary')) {
      settings.showAISummary = true;
    }

    return Object.keys(settings).length > 0 ? settings : null;
  } catch (e) {
    console.error('Failed to parse URL feature flags:', e);
    return null;
  }
}

/**
 * Load feature settings with priority: sessionStorage → localStorage
 */
function getFeatureSettings(): FeatureSettings {
  const defaults: FeatureSettings = {showAISummary: false};
  
  if (typeof window === 'undefined') {
    return defaults;
  }
  
  try {
    // Check sessionStorage first (takes precedence for URL-based overrides)
    const sessionStored = sessionStorage.getItem(FEATURE_SETTINGS_SESSION_KEY);
    if (sessionStored) {
      return JSON.parse(sessionStored) as FeatureSettings;
    }
    
    // Fall back to localStorage for persistent user preferences
    const stored = localStorage.getItem(FEATURE_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored) as FeatureSettings;
    }
  } catch (e) {
    console.error('Failed to load feature settings:', e);
  }
  
  return defaults;
}

/**
 * Save feature settings to both sessionStorage and localStorage
 * This ensures manual toggles always win over URL params
 */
function saveFeatureSettings(settings: FeatureSettings) {
  if (typeof window === 'undefined') return;
  
  try {
    // Save to both storages so manual preference persists
    sessionStorage.setItem(FEATURE_SETTINGS_SESSION_KEY, JSON.stringify(settings));
    localStorage.setItem(FEATURE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save feature settings:', e);
  }
}

/**
 * Initialize feature settings from URL params if present
 * Only writes to sessionStorage (not localStorage)
 */
function initializeFeatureSettingsFromURL() {
  if (typeof window === 'undefined') return;

  const urlSettings = getFeatureSettingsFromURL();
  if (!urlSettings) return;

  try {
    const currentSettings = getFeatureSettings();
    const mergedSettings = {...currentSettings, ...urlSettings};
    sessionStorage.setItem(
      FEATURE_SETTINGS_SESSION_KEY,
      JSON.stringify(mergedSettings),
    );

    window.dispatchEvent(
      new CustomEvent('featureSettingsChanged', {detail: mergedSettings}),
    );
  } catch (e) {
    console.error('Failed to initialize feature settings from URL:', e);
  }
}

export function FeaturePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<FeatureSettings>({
    showAISummary: false,
  });

  useEffect(() => {
    initializeFeatureSettingsFromURL();
    setSettings(getFeatureSettings());
  }, []);

  const handleToggle = (key: keyof FeatureSettings, value: boolean) => {
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
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-gray-900">
                                AI Summary Box
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                Show intent recommendations on search pages
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggle('showAISummary', !settings.showAISummary)
                              }
                              className={`${
                                settings.showAISummary
                                  ? 'bg-indigo-600'
                                  : 'bg-gray-200'
                              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                            >
                              <span
                                className={`${
                                  settings.showAISummary
                                    ? 'translate-x-5'
                                    : 'translate-x-0'
                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                              />
                            </button>
                          </div>

                          <div className="border-t border-gray-200 pt-6">
                            <p className="text-xs text-gray-500">
                              Settings are saved locally and persist across sessions.
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
  const [settings, setSettings] = useState<FeatureSettings>({
    showAISummary: false,
  });

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;

    // Initialize from URL params if present
    initializeFeatureSettingsFromURL();
    
    // Load current settings (includes URL-based overrides from sessionStorage)
    setSettings(getFeatureSettings());

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
