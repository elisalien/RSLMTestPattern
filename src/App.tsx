import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Eye, Grid3x3, Palette, Image as ImageIcon, Type, Layers, FileText, Monitor } from 'lucide-react';
import { resolumeParser } from './utils/resolume-parser';
import { patternGenerator } from './utils/pattern-generator';
import { ResolumeSetup, PatternType, PatternConfig, StylePreset, BrandingConfig, ViewMode, OutputResolution } from './types';

// Color palettes for auto-generation
const COLOR_PALETTES = {
  vibrant: ['#FF6B9D', '#C44569', '#FEA47F', '#F97F51', '#58B19F', '#2C3A47', '#B33771', '#3B3B98'],
  retro: ['#5F27CD', '#00D2D3', '#1DD1A1', '#EE5A24', '#FF9FF3', '#48DBFB', '#54A0FF', '#00D2D3'],
  neon: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF', '#06FFA5', '#FF006E', '#FFBE0B'],
  broadcast: ['#0000FF', '#00FF00', '#00FFFF', '#FF0000', '#FF00FF', '#FFFF00', '#FFFFFF', '#808080'],
  minitel: ['#00FF00', '#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#0000FF', '#FFFFFF', '#000000'],
} as const;

const PATTERNS = [
  { id: 'complete-pro', name: 'Complete Pro', icon: '🎯', description: 'Professional composite pattern' },
  { id: 'minimal-geometric', name: 'Minimal Geometric', icon: '⭕', description: 'Clean Apple-style design' },
  { id: 'gradient-paradise', name: 'Gradient Paradise', icon: '🌈', description: 'Vibrant multi-gradients' },
  { id: 'glassmorphic', name: 'Glassmorphic', icon: '💎', description: 'Modern glass effect' },
  { id: 'retro-future', name: 'Retro Future', icon: '⚡', description: 'CRT + Cyberpunk style' },
  { id: 'neo-brutalism', name: 'Neo-Brutalism', icon: '🎪', description: 'Bold colors + hard shadows' },
  { id: 'resolume', name: 'Resolume Classic', icon: '🎬', description: 'Classic Resolume pattern' },
  { id: 'pixel-grid', name: 'Pixel Grid', icon: '#', description: 'LED panel numbering' },
] as const;

const STYLE_PRESETS = [
  { id: 'modern', name: 'Modern', colors: { bg: '#1a1a1a', grid: '#00ff00', text: '#ffffff' } },
  { id: 'retro-crt', name: 'Retro CRT', colors: { bg: '#000000', grid: '#00ff00', text: '#00ff00' } },
  { id: 'bios', name: 'BIOS', colors: { bg: '#0000AA', grid: '#AAAAAA', text: '#FFFFFF' } },
  { id: 'minitel', name: 'Minitel', colors: { bg: '#000000', grid: '#00FF00', text: '#00FF00' } },
  { id: 'broadcast', name: 'Broadcast', colors: { bg: '#000000', grid: '#FFFFFF', text: '#FFFF00' } },
] as const;

const OUTPUT_RESOLUTIONS: OutputResolution[] = [
  { id: 'original', name: 'Original (XML)', width: 0, height: 0 },
  { id: 'hd', name: 'HD 1280×720', width: 1280, height: 720 },
  { id: 'fhd', name: 'Full HD 1920×1080', width: 1920, height: 1080 },
  { id: '2k', name: '2K 2560×1440', width: 2560, height: 1440 },
  { id: '4k', name: '4K UHD 3840×2160', width: 3840, height: 2160 },
  { id: 'custom', name: 'Custom', width: 0, height: 0 },
];

function App() {
  // State management
  const [resolumeSetup, setResolumeSetup] = useState<ResolumeSetup | null>(null);
  const [rawXML, setRawXML] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('output');
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('resolume');
  const [stylePreset, setStylePreset] = useState<StylePreset>('modern');
  const [sliceColors, setSliceColors] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [outputResolution, setOutputResolution] = useState<OutputResolution>(OUTPUT_RESOLUTIONS[0]);
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
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

  // Get actual output dimensions
  const getOutputDimensions = (): { width: number; height: number } => {
    if (!resolumeSetup) return { width: 1920, height: 1080 };

    if (outputResolution.id === 'original') {
      return resolumeSetup.compositionSize;
    } else if (outputResolution.id === 'custom') {
      return { width: customWidth, height: customHeight };
    } else {
      return { width: outputResolution.width, height: outputResolution.height };
    }
  };

  // Handle XML file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlContent = e.target?.result as string;
      setRawXML(xmlContent);
      const setup = resolumeParser.parse(xmlContent, viewMode);

      if (setup) {
        setResolumeSetup(setup);
        generateSliceColors(setup.slices);
      } else {
        alert('Error parsing Resolume XML. Check console for details.');
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  // Re-parse when view mode changes
  useEffect(() => {
    if (rawXML) {
      const setup = resolumeParser.parse(rawXML, viewMode);
      if (setup) {
        setResolumeSetup(setup);
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
  const generateSliceColors = (slices: any[]) => {
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
    const presetConfig = STYLE_PRESETS.find(p => p.id === preset);
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
    const outputDims = getOutputDimensions();

    // Scale slices proportionally if resolution is different
    const scaleX = outputDims.width / resolumeSetup.compositionSize.width;
    const scaleY = outputDims.height / resolumeSetup.compositionSize.height;

    const scaledSlices = resolumeSetup.slices.map(slice => ({
      ...slice,
      x: Math.round(slice.x * scaleX),
      y: Math.round(slice.y * scaleY),
      width: Math.round(slice.width * scaleX),
      height: Math.round(slice.height * scaleY),
    }));

    const canvas = patternGenerator.generateComposition(
      scaledSlices,
      outputDims.width,
      outputDims.height,
      config,
      sliceColors,
      branding.showCentralBranding ? branding.logo : undefined,
      branding.showCentralBranding ? branding.name : undefined
    );

    setCompositionCanvas(canvas);
  }, [resolumeSetup, selectedPattern, patternConfig, sliceColors, branding, outputResolution, customWidth, customHeight]);

  // Export composition as PNG
  const exportComposition = () => {
    if (!compositionCanvas || !resolumeSetup) return;

    compositionCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const modeLabel = viewMode === 'output' ? 'Output' : 'Input';
      const outputDims = getOutputDimensions();
      const filename = `${branding.name || resolumeSetup.name}_${selectedPattern}_${modeLabel}_${outputDims.width}x${outputDims.height}.png`;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-bold gradient-text mb-2">
                Resolume Test Pattern Generator
              </h1>
              <p className="text-gray-400 text-sm">Professional test patterns for Resolume Arena</p>
            </div>
            {resolumeSetup && (
              <div className="flex items-center gap-4 text-sm text-gray-400 animate-slide-up">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  <span>{resolumeSetup.slices.length} slices</span>
                </div>
                <div className="text-gray-600">|</div>
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-purple-400" />
                  <span>{getOutputDimensions().width}×{getOutputDimensions().height}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in">
          {/* XML Upload Card */}
          <div className="card">
            <div className="card-header">
              <FileText size={24} className="text-green-400" />
              Import XML
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full btn btn-success flex items-center justify-center gap-2 py-4"
            >
              {isLoading ? (
                <>
                  <div className="spinner w-5 h-5" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>Import Resolume XML</span>
                </>
              )}
            </button>

            {resolumeSetup && (
              <div className="mt-4 space-y-3 animate-slide-up">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-medium">✓ Loaded successfully</span>
                </div>

                <div className="section-header">View Mode</div>
                <div className="toggle-group w-full justify-center">
                  <button
                    onClick={() => setViewMode('output')}
                    className={`toggle-btn flex-1 ${viewMode === 'output' ? 'active' : ''}`}
                  >
                    Advanced Output
                  </button>
                  <button
                    onClick={() => setViewMode('input')}
                    className={`toggle-btn flex-1 ${viewMode === 'input' ? 'active' : ''}`}
                  >
                    Advanced Input
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logo Upload Card */}
          <div className="card">
            <div className="card-header">
              <ImageIcon size={24} className="text-purple-400" />
              Branding
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full btn btn-purple flex items-center justify-center gap-2 py-4"
            >
              <ImageIcon size={20} />
              <span>Upload Logo</span>
            </button>

            <div className="mt-4 space-y-3">
              <div>
                <label className="section-header">
                  <Type size={16} />
                  Branding Name
                </label>
                <input
                  type="text"
                  value={branding.name}
                  onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                  placeholder="Your name or company..."
                  className="input"
                />
              </div>
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.showCentralBranding}
                  onChange={(e) => setBranding({ ...branding, showCentralBranding: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                />
                Show logo on composition
              </label>
            </div>
          </div>
        </div>

        {resolumeSetup && (
          <div className="space-y-6 animate-scale-in">
            {/* Pattern Selection */}
            <div className="card">
              <div className="card-header">
                <Grid3x3 size={24} className="text-cyan-400" />
                Pattern Selection
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {PATTERNS.map((pattern) => (
                  <div
                    key={pattern.id}
                    onClick={() => setSelectedPattern(pattern.id as PatternType)}
                    className={`pattern-card border-gray-600 ${selectedPattern === pattern.id ? 'active' : ''}`}
                    title={pattern.description}
                  >
                    <div className="text-3xl mb-2">{pattern.icon}</div>
                    <div className="text-xs text-gray-300 font-medium">{pattern.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Style & Colors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Style Presets */}
              <div className="card">
                <div className="card-header">
                  <Palette size={24} className="text-pink-400" />
                  Style Presets
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyStylePreset(preset.id as StylePreset)}
                      className={`btn ${stylePreset === preset.id ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palettes */}
              <div className="card">
                <div className="card-header">
                  <Palette size={24} className="text-yellow-400" />
                  Color Palettes
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(COLOR_PALETTES).map((paletteName) => (
                    <button
                      key={paletteName}
                      onClick={() => applyColorPalette(paletteName as keyof typeof COLOR_PALETTES)}
                      className="btn btn-secondary capitalize"
                    >
                      {paletteName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="card">
              <div className="card-header">
                <Settings size={24} className="text-orange-400" />
                Advanced Settings
              </div>

              {/* Resolution Selector */}
              <div className="mb-6">
                <label className="section-header flex items-center gap-2">
                  <Monitor size={16} />
                  Output Resolution
                </label>
                <select
                  value={outputResolution.id}
                  onChange={(e) => {
                    const selected = OUTPUT_RESOLUTIONS.find(r => r.id === e.target.value);
                    if (selected) setOutputResolution(selected);
                  }}
                  className="input mb-2"
                >
                  <option value="original">
                    Original ({resolumeSetup?.compositionSize.width}×{resolumeSetup?.compositionSize.height})
                  </option>
                  {OUTPUT_RESOLUTIONS.slice(1).map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name}
                    </option>
                  ))}
                </select>

                {outputResolution.id === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Width</label>
                      <input
                        type="number"
                        min="320"
                        max="7680"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                        className="input"
                        placeholder="1920"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Height</label>
                      <input
                        type="number"
                        min="240"
                        max="4320"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                        className="input"
                        placeholder="1080"
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  {outputResolution.id === 'original'
                    ? 'Using composition size from XML'
                    : `Output: ${getOutputDimensions().width}×${getOutputDimensions().height}`}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="section-header">Grid Color</label>
                  <input
                    type="color"
                    value={patternConfig.gridColor}
                    onChange={(e) => setPatternConfig({ ...patternConfig, gridColor: e.target.value })}
                    className="w-full h-12 rounded-lg cursor-pointer border border-gray-600"
                  />
                </div>
                <div>
                  <label className="section-header">Text Color</label>
                  <input
                    type="color"
                    value={patternConfig.textColor}
                    onChange={(e) => setPatternConfig({ ...patternConfig, textColor: e.target.value })}
                    className="w-full h-12 rounded-lg cursor-pointer border border-gray-600"
                  />
                </div>
                <div>
                  <label className="section-header">Grid Size (px)</label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={patternConfig.gridSize}
                    onChange={(e) => setPatternConfig({ ...patternConfig, gridSize: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-6">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patternConfig.showText}
                    onChange={(e) => setPatternConfig({ ...patternConfig, showText: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 text-cyan-500"
                  />
                  Show text labels
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patternConfig.showDiagonal}
                    onChange={(e) => setPatternConfig({ ...patternConfig, showDiagonal: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 text-cyan-500"
                  />
                  Show diagonals
                </label>
              </div>
            </div>

            {/* Slice Colors */}
            <div className="card">
              <div className="card-header">
                <Palette size={24} className="text-purple-400" />
                Slice Colors
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {resolumeSetup.slices.map((slice) => (
                  <div key={slice.id} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={sliceColors.get(slice.id) || '#000000'}
                      onChange={(e) => changeSliceColor(slice.id, e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-gray-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{slice.name}</div>
                      <div className="text-gray-400 text-xs">{slice.width}×{slice.height}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export & Preview */}
            <div className="card">
              <button
                onClick={exportComposition}
                className="w-full btn btn-success flex items-center justify-center gap-3 py-6 text-lg"
              >
                <Download size={24} />
                <span>
                  Export {viewMode === 'output' ? 'Output' : 'Input'}
                  ({getOutputDimensions().width}×{getOutputDimensions().height})
                </span>
              </button>
            </div>

            {/* Preview */}
            <div className="card">
              <div className="card-header">
                <Eye size={24} className="text-blue-400" />
                Composition Preview
              </div>
              {compositionCanvas && (
                <div className="canvas-preview">
                  <img
                    src={compositionCanvas.toDataURL()}
                    alt="Test Pattern Composition"
                    className="w-full h-auto"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!resolumeSetup && !isLoading && (
          <div className="card text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Start</h3>
            <p className="text-gray-400">Import your Resolume XML file to begin creating test patterns</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
