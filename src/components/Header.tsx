import { Layers, Monitor, PanelLeftClose, PanelLeft, ScreenShare, Instagram } from 'lucide-react';
import { useStore } from '../store';

export function Header() {
  const setup = useStore(s => s.resolumeSetup);
  const dims = useStore(s => s.getOutputDimensions)();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const toggleSidebar = useStore(s => s.toggleSidebar);
  const screens = useStore(s => s.screens);
  const activeScreenIndex = useStore(s => s.activeScreenIndex);
  const disabledSlices = useStore(s => s.disabledSlices);
  const viewMode = useStore(s => s.viewMode);

  const activeCount = setup ? setup.slices.length - disabledSlices.size : 0;

  return (
    <header className="h-14 bg-gray-900/90 backdrop-blur-md border-b border-gray-700/50 flex items-center px-4 gap-4 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
      </button>

      <h1 className="text-lg font-bold gradient-text whitespace-nowrap hidden sm:block">
        RSLM Test Pattern Studio
      </h1>
      <h1 className="text-lg font-bold gradient-text whitespace-nowrap sm:hidden">
        RSLM
      </h1>

      <a
        href="https://instagram.com/elisalien"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 hover:border-pink-400/60 text-pink-300 hover:text-pink-200 transition-all text-[11px] whitespace-nowrap"
        title="Follow @elisalien on Instagram"
      >
        <Instagram size={13} />
        <span className="hidden sm:inline">made with love by @elisalien</span>
        <span className="sm:hidden">@elisalien</span>
      </a>

      <div className="flex-1" />

      {setup && (
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap justify-end">
          {screens.length > 1 && (
            <>
              <div className="flex items-center gap-1.5">
                <ScreenShare size={14} className="text-yellow-400" />
                <span>Screen {activeScreenIndex + 1}/{screens.length}</span>
              </div>
              <div className="text-gray-600 hidden sm:block">|</div>
            </>
          )}
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-cyan-400" />
            <span>{activeCount}/{setup.slices.length} slices</span>
          </div>
          <div className="text-gray-600 hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <Monitor size={14} className="text-purple-400" />
            <span>{dims.width}x{dims.height}</span>
          </div>
          <div className="text-gray-600 hidden sm:block">|</div>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
            viewMode === 'output' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
            {viewMode}
          </div>
        </div>
      )}
    </header>
  );
}
