import React, { useState, useEffect } from 'react';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    const ios = isIOS();
    setIsIosDevice(ios);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    if (ios) {
      // iOS does not fire beforeinstallprompt; show manual instructions instead
      setShowPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-sweep px-4 w-full max-w-md">
      <div className="bg-surface-container-lowest border border-outline-variant shadow-xl rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary text-lg font-black shrink-0">
            Z
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary">Install Zawadi</p>
            <p className="text-[10px] text-on-surface-variant">
              {isIosDevice ? 'Add to your home screen for the best experience' : 'Add to your desktop for the best experience'}
            </p>
          </div>
          {!isIosDevice && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-container transition-colors cursor-pointer shrink-0"
            >
              Install
            </button>
          )}
          <button
            onClick={() => setShowPrompt(false)}
            className="text-on-surface-variant hover:text-primary p-1 cursor-pointer shrink-0 leading-none text-lg"
            title="Dismiss"
          >
            ✕
          </button>
        </div>

        {isIosDevice && (
          <div className="bg-surface-container-high rounded-xl p-3 text-[10px] text-on-surface-variant leading-relaxed flex items-start gap-2">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">ios_share</span>
            <span>
              Tap the <strong>Share</strong> button <span className="text-xs">⎙</span> in the Safari toolbar, then scroll down and tap <strong>Add to Home Screen</strong>.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
