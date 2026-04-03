import { Layers, Monitor, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useStore } from '../store';

export function Header() {
  const setup = useStore(s => s.resolumeSetup);
  const dims = useStore(s => s.getOutputDimensions)();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const toggleSidebar = useStore(s => s.toggleSidebar);

  return (
    <header className="h-14 bg-gray-900/90 backdrop-blur-md border-b border-gray-700/50 flex items-center px-4 gap-4 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
      </button>

      <h1 className="text-lg font-bold gradient-text whitespace-nowrap">
        RSLM Test Pattern Studio
      </h1>

      <div className="flex-1" />

      {setup && (
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-cyan-400" />
            <span>{setup.slices.length} slices</span>
          </div>
          <div className="text-gray-600">|</div>
          <div className="flex items-center gap-1.5">
            <Monitor size={14} className="text-purple-400" />
            <span>{dims.width}x{dims.height}</span>
          </div>
        </div>
      )}
    </header>
  );
}
