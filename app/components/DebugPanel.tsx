import {useState, useEffect} from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {XMarkIcon, Cog6ToothIcon} from '@heroicons/react/24/outline';

const DEBUG_SETTINGS_KEY = 'barca_debug_settings';

interface DebugSettings {
  showAISummary: boolean;
}

function getDebugSettings(): DebugSettings {
  if (typeof window === 'undefined') {
    return {showAISummary: false};
  }
  try {
    const stored = localStorage.getItem(DEBUG_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored) as DebugSettings;
    }
  } catch (e) {
    console.error('Failed to load debug settings:', e);
  }
  return {showAISummary: false};
}

function saveDebugSettings(settings: DebugSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEBUG_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save debug settings:', e);
  }
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<DebugSettings>({
    showAISummary: false,
  });

  useEffect(() => {
    setSettings(getDebugSettings());
  }, []);

  const handleToggle = (key: keyof DebugSettings, value: boolean) => {
    const newSettings = {...settings, [key]: value};
    setSettings(newSettings);
    saveDebugSettings(newSettings);
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('debugSettingsChanged', {detail: newSettings}),
      );
    }
  };

  return (
    <>
      {/* Floating Debug Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-indigo-400 p-1.5 text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 transition-colors"
        aria-label="Open debug panel"
      >
        <Cog6ToothIcon className="h-4 w-4" />
      </button>

      {/* Debug Drawer */}
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
                            Debug Settings
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

export function useDebugSettings() {
  const [settings, setSettings] = useState<DebugSettings>({
    showAISummary: false,
  });

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;

    setSettings(getDebugSettings());

    const handleSettingsChange = (event: CustomEvent<DebugSettings>) => {
      setSettings(event.detail);
    };

    window.addEventListener(
      'debugSettingsChanged',
      handleSettingsChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'debugSettingsChanged',
        handleSettingsChange as EventListener,
      );
    };
  }, []);

  return settings;
}
