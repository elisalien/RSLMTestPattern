import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Eye, Grid3x3, Palette, Save, FileType } from 'lucide-react';
import { resolumeParser } from './utils/resolume-parser';
import { patternGenerator } from './utils/pattern-generator';
import { ResolumeSetup, SliceData, PatternType, PatternConfig } from './types';

function App() {
  // State management
  const [resolumeSetup, setResolumeSetup] = useState<ResolumeSetup | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('resolume');
  const [xpMode, setXpMode] = useState(false);
  const [selectedSlices, setSelectedSlices] = useState<Set<string>>(new Set());
  const [patternConfig, setPatternConfig] = useState<PatternConfig>({
    type: 'resolume',
    backgroundColor: '#1a1a1a',
    gridColor: '#00ff00',
    textColor: '#ffffff',
    showText: true,
    showUFO: true,
    showDiagonal: true,
    gridSize: 50,
    fontSize: 24,
  });
  const [generatedCanvases, setGeneratedCanvases] = useState<Map<string, HTMLCanvasElement>>(new Map());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pattern definitions
  const patterns = [
    { id: 'resolume', name: 'Resolume', icon: '🎯', description: 'Default Resolume pattern' },
    { id: 'smpte-75', name: 'SMPTE 75%', icon: '📺', description: 'Broadcast standard (NTSC)' },
    { id: 'smpte-100', name: 'SMPTE 100%', icon: '📺', description: 'Full intensity bars' },
    { id: 'ebu-75', name: 'EBU 75%', icon: '🇪🇺', description: 'European broadcast' },
    { id: 'crosshatch', name: 'Crosshatch', icon: '⊞', description: 'Convergence test' },
    { id: 'monoscope', name: 'Monoscope', icon: '◉', description: 'Complete test pattern' },
    { id: 'zone-plate', name: 'Zone Plate', icon: '🎯', description: 'Focus/resolution test' },
    { id: 'gradient-ramp', name: 'Gradient', icon: '▦', description: 'Luminance calibration' },
    { id: 'pixel-grid', name: 'Pixel Grid', icon: '#', description: 'LED panel numbering' },
  ] as const;

  // Handle XML file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlContent = e.target?.result as string;
      const setup = resolumeParser.parse(xmlContent);
      
      if (setup) {
        setResolumeSetup(setup);
        // Select all slices by default
        const allSliceIds = new Set(setup.slices.map(s => s.id));
        setSelectedSlices(allSliceIds);
      } else {
        alert('Erreur lors du parsing du XML Resolume');
      }
    };
    reader.readAsText(file);
  };

  // Generate patterns for selected slices
  useEffect(() => {
    if (!resolumeSetup || selectedSlices.size === 0) return;

    const config = { ...patternConfig, type: selectedPattern };
    const newCanvases = new Map<string, HTMLCanvasElement>();

    resolumeSetup.slices.forEach((slice) => {
      if (selectedSlices.has(slice.id)) {
        const canvas = patternGenerator.generate(slice, config);
        // Clone the canvas to preserve it
        const clonedCanvas = document.createElement('canvas');
        clonedCanvas.width = canvas.width;
        clonedCanvas.height = canvas.height;
        const ctx = clonedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
        }
        newCanvases.set(slice.id, clonedCanvas);
      }
    });

    setGeneratedCanvases(newCanvases);
  }, [resolumeSetup, selectedPattern, patternConfig, selectedSlices]);

  // Toggle slice selection
  const toggleSliceSelection = (sliceId: string, ctrlKey: boolean) => {
    setSelectedSlices((prev) => {
      const newSet = new Set(prev);
      if (ctrlKey) {
        if (newSet.has(sliceId)) {
          newSet.delete(sliceId);
        } else {
          newSet.add(sliceId);
        }
      } else {
        return new Set([sliceId]);
      }
      return newSet;
    });
  };

  // Export single slice as PNG
  const exportSlice = (sliceId: string, sliceName: string) => {
    const canvas = generatedCanvases.get(sliceId);
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sliceName}_${selectedPattern}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Export all slices
  const exportAll = () => {
    generatedCanvases.forEach((canvas, sliceId) => {
      const slice = resolumeSetup?.slices.find(s => s.id === sliceId);
      if (slice) {
        exportSlice(sliceId, slice.name);
      }
    });
  };

  return (
    <div className={`min-h-screen ${xpMode ? 'bg-gradient-to-b from-blue-500 to-blue-600' : 'bg-gray-900'}`}>
      {/* Header */}
      <div className={xpMode ? 'xp-window m-4' : 'bg-gray-800 border-b border-gray-700'}>
        <div className={xpMode ? 'xp-titlebar' : 'flex items-center justify-between p-4'}>
          <h1 className={xpMode ? '' : 'text-2xl font-bold text-white'}>
            🎬 Resolume Test Pattern Generator
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setXpMode(!xpMode)}
              className={xpMode ? 'xp-button' : 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'}
            >
              {xpMode ? '💿 Mode XP' : '💿 Windows XP'}
            </button>
          </div>
        </div>
        
        <div className={xpMode ? 'xp-content' : 'p-4 bg-gray-800'}>
          {/* Upload Section */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={xpMode ? 'xp-button' : 'flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition'}
            >
              <Upload size={20} />
              Import Resolume XML
            </button>
            {resolumeSetup && (
              <p className={xpMode ? 'mt-2 text-sm' : 'mt-2 text-sm text-gray-300'}>
                ✓ {resolumeSetup.name} - {resolumeSetup.slices.length} slices | 
                Composition: {resolumeSetup.compositionSize.width}x{resolumeSetup.compositionSize.height}
              </p>
            )}
          </div>

          {resolumeSetup && (
            <>
              {/* Pattern Selection */}
              <div className="mb-6">
                <h2 className={xpMode ? 'text-lg font-bold mb-3' : 'text-xl font-bold text-white mb-3'}>
                  <Grid3x3 className="inline mr-2" size={24} />
                  Sélection du Pattern
                </h2>
                <div className="pattern-selector">
                  {patterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => setSelectedPattern(pattern.id as PatternType)}
                      className={`pattern-card ${selectedPattern === pattern.id ? 'selected' : ''} ${
                        xpMode ? 'xp-button' : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                      title={pattern.description}
                    >
                      <div className="text-3xl mb-1">{pattern.icon}</div>
                      <div className="text-sm font-medium">{pattern.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration Panel */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Settings size={24} />
                  Configuration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Couleur de fond
                    </label>
                    <input
                      type="color"
                      value={patternConfig.backgroundColor}
                      onChange={(e) => setPatternConfig({ ...patternConfig, backgroundColor: e.target.value })}
                      className={xpMode ? 'xp-input w-full' : 'w-full h-10 rounded cursor-pointer'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Couleur de grille
                    </label>
                    <input
                      type="color"
                      value={patternConfig.gridColor}
                      onChange={(e) => setPatternConfig({ ...patternConfig, gridColor: e.target.value })}
                      className={xpMode ? 'xp-input w-full' : 'w-full h-10 rounded cursor-pointer'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Couleur du texte
                    </label>
                    <input
                      type="color"
                      value={patternConfig.textColor}
                      onChange={(e) => setPatternConfig({ ...patternConfig, textColor: e.target.value })}
                      className={xpMode ? 'xp-input w-full' : 'w-full h-10 rounded cursor-pointer'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Taille de grille (px)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={patternConfig.gridSize}
                      onChange={(e) => setPatternConfig({ ...patternConfig, gridSize: parseInt(e.target.value) })}
                      className={xpMode ? 'xp-input w-full' : 'w-full px-3 py-2 bg-gray-600 text-white rounded'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Taille du texte (px)
                    </label>
                    <input
                      type="number"
                      min="12"
                      max="72"
                      value={patternConfig.fontSize}
                      onChange={(e) => setPatternConfig({ ...patternConfig, fontSize: parseInt(e.target.value) })}
                      className={xpMode ? 'xp-input w-full' : 'w-full px-3 py-2 bg-gray-600 text-white rounded'}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={patternConfig.showText}
                      onChange={(e) => setPatternConfig({ ...patternConfig, showText: e.target.checked })}
                    />
                    Afficher le texte
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={patternConfig.showUFO}
                      onChange={(e) => setPatternConfig({ ...patternConfig, showUFO: e.target.checked })}
                    />
                    Afficher UFOs
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={patternConfig.showDiagonal}
                      onChange={(e) => setPatternConfig({ ...patternConfig, showDiagonal: e.target.checked })}
                    />
                    Afficher diagonale
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mb-6 flex gap-3">
                <button
                  onClick={exportAll}
                  className={xpMode ? 'xp-button' : 'flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700'}
                >
                  <Download size={20} />
                  Exporter tout ({selectedSlices.size} slices)
                </button>
              </div>

              {/* Slices Preview */}
              <div>
                <h2 className={xpMode ? 'text-lg font-bold mb-3' : 'text-xl font-bold text-white mb-3 flex items-center gap-2'}>
                  <Eye size={24} />
                  Preview des Slices
                </h2>
                <p className="text-sm text-gray-400 mb-3">
                  Ctrl + Clic pour sélection multiple
                </p>
                <div className="slice-grid">
                  {resolumeSetup.slices.map((slice) => {
                    const canvas = generatedCanvases.get(slice.id);
                    const isSelected = selectedSlices.has(slice.id);
                    
                    return (
                      <div
                        key={slice.id}
                        className={`p-4 rounded-lg cursor-pointer transition ${
                          isSelected
                            ? xpMode ? 'bg-blue-200 border-2 border-blue-600' : 'bg-gray-700 border-2 border-blue-500'
                            : xpMode ? 'bg-white border-2 border-gray-400' : 'bg-gray-800 border-2 border-gray-600'
                        }`}
                        onClick={(e) => toggleSliceSelection(slice.id, e.ctrlKey || e.metaKey)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className={xpMode ? 'font-bold text-sm' : 'font-bold text-white text-sm'}>
                              {slice.name}
                            </h3>
                            <p className={xpMode ? 'text-xs' : 'text-xs text-gray-400'}>
                              {slice.width}×{slice.height} px | Position: ({slice.x}, {slice.y})
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportSlice(slice.id, slice.name);
                            }}
                            className={xpMode ? 'xp-button text-xs' : 'px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700'}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                        {canvas && (
                          <div className="canvas-preview bg-black rounded overflow-hidden">
                            <img
                              src={canvas.toDataURL()}
                              alt={slice.name}
                              className="w-full h-auto"
                              style={{ imageRendering: 'crisp-edges' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
