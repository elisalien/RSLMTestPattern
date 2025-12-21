import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Eye, Grid3x3, Palette, Image as ImageIcon, Type, Layers } from 'lucide-react';
import { resolumeParser } from './utils/resolume-parser';
import { patternGenerator } from './utils/pattern-generator';
import { ResolumeSetup, SliceData, PatternType, PatternConfig, StylePreset, BrandingConfig, ViewMode } from './types';
import chroma from 'chroma-js';

// Color palettes for auto-generation
const COLOR_PALETTES = {
  vibrant: ['#FF6B9D', '#C44569', '#FEA47F', '#F97F51', '#58B19F', '#2C3A47', '#B33771', '#3B3B98'],
  retro: ['#5F27CD', '#00D2D3', '#1DD1A1', '#EE5A24', '#FF9FF3', '#48DBFB', '#54A0FF', '#00D2D3'],
  neon: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF', '#06FFA5', '#FF006E', '#FFBE0B'],
  broadcast: ['#0000FF', '#00FF00', '#00FFFF', '#FF0000', '#FF00FF', '#FFFF00', '#FFFFFF', '#808080'],
  minitel: ['#00FF00', '#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#0000FF', '#FFFFFF', '#000000'],
};

function App() {
  // State management
  const [resolumeSetup, setResolumeSetup] = useState<ResolumeSetup | null>(null);
  const [rawXML, setRawXML] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('output');
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('resolume');
  const [stylePreset, setStylePreset] = useState<StylePreset>('modern');
  const [xpMode, setXpMode] = useState(false);
  const [sliceColors, setSliceColors] = useState<Map<string, string>>(new Map());
  const [branding, setBranding] = useState<BrandingConfig>({
    name: '',
    showCentralBranding: false,
  });
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
    stylePreset: 'modern',
  });
  const [compositionCanvas, setCompositionCanvas] = useState<HTMLCanvasElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Pattern definitions
  const patterns = [
    { id: 'complete-pro', name: 'Complete Pro', icon: '🎯', description: 'Tous éléments combinés - Portfolio quality' },
    { id: 'minimal-geometric', name: 'Minimal Geometric', icon: '⭕', description: 'Design épuré style Apple/Dieter Rams' },
    { id: 'gradient-paradise', name: 'Gradient Paradise', icon: '🌈', description: 'Multi-gradients vibrants Behance 2025' },
    { id: 'glassmorphic', name: 'Glassmorphic', icon: '💎', description: 'Glass effect moderne iOS-style' },
    { id: 'retro-future', name: 'Retro Future', icon: '⚡', description: 'CRT + Cyberpunk + Synthwave' },
    { id: 'neo-brutalism', name: 'Neo-Brutalism', icon: '🎪', description: 'Bold colors + hard shadows' },
    { id: 'resolume', name: 'Resolume Classic', icon: '🎬', description: 'Pattern classique Resolume' },
    { id: 'pixel-grid', name: 'Pixel Grid', icon: '#', description: 'LED panel numbering' },
  ] as const;

  // Style presets
  const stylePresets = [
    { id: 'modern', name: 'Modern', colors: { bg: '#1a1a1a', grid: '#00ff00', text: '#ffffff' } },
    { id: 'retro-crt', name: 'Retro CRT', colors: { bg: '#000000', grid: '#00ff00', text: '#00ff00' } },
    { id: 'bios', name: 'BIOS', colors: { bg: '#0000AA', grid: '#AAAAAA', text: '#FFFFFF' } },
    { id: 'minitel', name: 'Minitel', colors: { bg: '#000000', grid: '#00FF00', text: '#00FF00' } },
    { id: 'broadcast', name: 'Broadcast', colors: { bg: '#000000', grid: '#FFFFFF', text: '#FFFF00' } },
  ] as const;

  // Handle XML file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlContent = e.target?.result as string;
      setRawXML(xmlContent);
      const setup = resolumeParser.parse(xmlContent, viewMode);

      if (setup) {
        setResolumeSetup(setup);
        // Generate random colors for each slice
        generateSliceColors(setup.slices);
      } else {
        alert('Erreur lors du parsing du XML Resolume');
      }
    };
    reader.readAsText(file);
  };

  // Re-parse when view mode changes
  useEffect(() => {
    if (rawXML) {
      const setup = resolumeParser.parse(rawXML, viewMode);
      if (setup) {
        setResolumeSetup(setup);
        // Preserve existing colors when switching modes
        // Only generate new colors if we don't have them yet
        if (sliceColors.size === 0) {
          generateSliceColors(setup.slices);
        }
      }
    }
  }, [viewMode, rawXML]);

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setBranding({ ...branding, logo: img });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate random colors for slices
  const generateSliceColors = (slices: SliceData[]) => {
    const palette = COLOR_PALETTES.vibrant;
    const newColors = new Map<string, string>();
    
    slices.forEach((slice, index) => {
      newColors.set(slice.id, palette[index % palette.length]);
    });
    
    setSliceColors(newColors);
  };

  // Apply color palette
  const applyColorPalette = (paletteName: keyof typeof COLOR_PALETTES) => {
    if (!resolumeSetup) return;
    
    const palette = COLOR_PALETTES[paletteName];
    const newColors = new Map<string, string>();
    
    resolumeSetup.slices.forEach((slice, index) => {
      newColors.set(slice.id, palette[index % palette.length]);
    });
    
    setSliceColors(newColors);
  };

  // Apply style preset
  const applyStylePreset = (preset: StylePreset) => {
    setStylePreset(preset);
    const presetConfig = stylePresets.find(p => p.id === preset);
    if (presetConfig) {
      setPatternConfig({
        ...patternConfig,
        backgroundColor: presetConfig.colors.bg,
        gridColor: presetConfig.colors.grid,
        textColor: presetConfig.colors.text,
        stylePreset: preset,
      });
    }
  };

  // Generate complete composition
  useEffect(() => {
    if (!resolumeSetup) return;

    const config = { ...patternConfig, type: selectedPattern };
    const canvas = patternGenerator.generateComposition(
      resolumeSetup.slices,
      resolumeSetup.compositionSize.width,
      resolumeSetup.compositionSize.height,
      config,
      sliceColors,
      branding.showCentralBranding ? branding.logo : undefined,
      branding.showCentralBranding ? branding.name : undefined
    );

    setCompositionCanvas(canvas);
  }, [resolumeSetup, selectedPattern, patternConfig, sliceColors, branding]);

  // Export composition as PNG
  const exportComposition = () => {
    if (!compositionCanvas || !resolumeSetup) return;

    compositionCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const modeLabel = viewMode === 'output' ? 'Output' : 'Input';
      const filename = `${branding.name || resolumeSetup.name}_${selectedPattern}_${modeLabel}_${resolumeSetup.compositionSize.width}x${resolumeSetup.compositionSize.height}.png`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Change slice color
  const changeSliceColor = (sliceId: string, color: string) => {
    const newColors = new Map(sliceColors);
    newColors.set(sliceId, color);
    setSliceColors(newColors);
  };

  return (
    <div className={`min-h-screen ${xpMode ? 'bg-gradient-to-b from-blue-500 to-blue-600' : 'bg-gray-900'}`}>
      {/* Header */}
      <div className={xpMode ? 'xp-window m-4' : 'bg-gray-800 border-b border-gray-700'}>
        <div className={xpMode ? 'xp-titlebar' : 'flex items-center justify-between p-4'}>
          <h1 className={xpMode ? '' : 'text-2xl font-bold text-white'}>
            🎬 Resolume Test Pattern Generator v2
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={xpMode ? 'xp-button w-full' : 'flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition w-full justify-center'}
              >
                <Upload size={20} />
                Import Resolume XML
              </button>
              {resolumeSetup && (
                <div>
                  <p className={xpMode ? 'mt-2 text-sm' : 'mt-2 text-sm text-gray-300'}>
                    ✓ {resolumeSetup.slices.length} slices | {resolumeSetup.compositionSize.width}×{resolumeSetup.compositionSize.height}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Layers size={16} className="text-cyan-400" />
                    <span className="text-xs text-gray-400">Mode de visualisation:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setViewMode('output')}
                        className={`px-3 py-1 text-xs rounded transition ${
                          viewMode === 'output'
                            ? 'bg-cyan-500 text-white font-bold'
                            : xpMode ? 'xp-button text-xs' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Advanced Output
                      </button>
                      <button
                        onClick={() => setViewMode('input')}
                        className={`px-3 py-1 text-xs rounded transition ${
                          viewMode === 'input'
                            ? 'bg-cyan-500 text-white font-bold'
                            : xpMode ? 'xp-button text-xs' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Advanced Input
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className={xpMode ? 'xp-button w-full' : 'flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition w-full justify-center'}
              >
                <ImageIcon size={20} />
                Upload Logo
              </button>
              {branding.logo && (
                <p className={xpMode ? 'mt-2 text-sm' : 'mt-2 text-sm text-gray-300'}>
                  ✓ Logo chargé
                </p>
              )}
            </div>
          </div>

          {resolumeSetup && (
            <>
              {/* Branding Section */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Type size={24} />
                  Branding
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nom / Branding
                    </label>
                    <input
                      type="text"
                      value={branding.name}
                      onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                      placeholder="VENTU, ton nom, ta société..."
                      className={xpMode ? 'xp-input w-full' : 'w-full px-3 py-2 bg-gray-600 text-white rounded'}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={branding.showCentralBranding}
                        onChange={(e) => setBranding({ ...branding, showCentralBranding: e.target.checked })}
                      />
                      Afficher logo central
                    </label>
                  </div>
                </div>
              </div>

              {/* Pattern Selection */}
              <div className="mb-6">
                <h2 className={xpMode ? 'text-lg font-bold mb-3' : 'text-xl font-bold text-white mb-3'}>
                  <Grid3x3 className="inline mr-2" size={24} />
                  Pattern & Style
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Pattern Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type de Pattern</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {patterns.map((pattern) => (
                        <button
                          key={pattern.id}
                          onClick={() => setSelectedPattern(pattern.id as PatternType)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            selectedPattern === pattern.id
                              ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20'
                              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                          }`}
                          title={pattern.description}
                        >
                          <div className="text-3xl mb-1">{pattern.icon}</div>
                          <div className="text-xs font-medium text-white">{pattern.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Preset */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Style Rétro</label>
                    <div className="grid grid-cols-2 gap-2">
                      {stylePresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyStylePreset(preset.id as StylePreset)}
                          className={`px-3 py-2 rounded text-sm ${
                            stylePreset === preset.id
                              ? 'bg-blue-600 text-white'
                              : xpMode ? 'xp-button' : 'bg-gray-700 hover:bg-gray-600 text-white'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Palettes */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Palette size={24} />
                  Palettes de Couleurs
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(COLOR_PALETTES).map((paletteName) => (
                    <button
                      key={paletteName}
                      onClick={() => applyColorPalette(paletteName as keyof typeof COLOR_PALETTES)}
                      className={xpMode ? 'xp-button' : 'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded capitalize'}
                    >
                      {paletteName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slice Colors */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-3">Couleurs par Slice</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {resolumeSetup.slices.map((slice) => (
                    <div key={slice.id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={sliceColors.get(slice.id) || '#000000'}
                        onChange={(e) => changeSliceColor(slice.id, e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer"
                      />
                      <div>
                        <div className="text-white text-sm font-medium">{slice.name}</div>
                        <div className="text-gray-400 text-xs">{slice.width}×{slice.height}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Panel */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Settings size={24} />
                  Configuration Avancée
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Couleur de grille
                    </label>
                    <input
                      type="color"
                      value={patternConfig.gridColor}
                      onChange={(e) => setPatternConfig({ ...patternConfig, gridColor: e.target.value })}
                      className="w-full h-10 rounded cursor-pointer"
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
                      className="w-full h-10 rounded cursor-pointer"
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
                      checked={patternConfig.showDiagonal}
                      onChange={(e) => setPatternConfig({ ...patternConfig, showDiagonal: e.target.checked })}
                    />
                    Diagonales globales
                  </label>
                </div>
              </div>

              {/* Export Button */}
              <div className="mb-6">
                <button
                  onClick={exportComposition}
                  className={xpMode ? 'xp-button text-lg py-3 px-8' : 'flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg font-bold'}
                >
                  <Download size={24} />
                  Exporter la Composition {viewMode === 'output' ? 'Advanced Output' : 'Advanced Input'} ({resolumeSetup.compositionSize.width}×{resolumeSetup.compositionSize.height})
                </button>
              </div>

              {/* Preview */}
              <div>
                <h2 className={xpMode ? 'text-lg font-bold mb-3' : 'text-xl font-bold text-white mb-3 flex items-center gap-2'}>
                  <Eye size={24} />
                  Preview Composition Complète
                </h2>
                {compositionCanvas && (
                  <div className="canvas-preview bg-black rounded overflow-hidden max-w-full">
                    <img
                      src={compositionCanvas.toDataURL()}
                      alt="Test Pattern Composition"
                      className="w-full h-auto"
                      style={{ imageRendering: 'crisp-edges' }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
