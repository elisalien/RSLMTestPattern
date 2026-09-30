// ─── Geometry ────────────────────────────────────────────────────

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** Local frame of a slice in composition space: origin at the first input
 *  vertex, x axis along the top edge. Lets rotated input rects render
 *  exactly like Resolume samples them. */
export interface Frame { x: number; y: number; w: number; h: number; angle: number }

// ─── Resolume setup ─────────────────────────────────────────────

export interface Lattice { cols: number; rows: number; pts: Pt[] }

export interface Slice {
  id: string;
  name: string;
  kind: 'slice' | 'polygon';
  screenId: string;
  screenName: string;
  /** Global order across the whole setup (drives slice colour). */
  index: number;
  enabled: boolean;
  source: string;
  /** Input quad in composition pixels: TL, TR, BR, BL. */
  input: Pt[];
  inputContour?: Pt[];
  /** Output quad in screen pixels: TL, TR, BR, BL. */
  output: Pt[];
  outputContour?: Pt[];
  /** Output warp lattice (Resolume BezierWarper vertices, homography applied). */
  lattice?: Lattice;
  frame: Frame;
  bbox: Rect;
  /** Other slices sharing the exact same input region (other screens). */
  twins: string[];
}

export interface Screen {
  id: string;
  name: string;
  enabled: boolean;
  device: { type: string; name: string };
  size: { w: number; h: number };
  slices: Slice[];
}

export interface Setup {
  name: string;
  version: string;
  comp: { w: number; h: number };
  screens: Screen[];
  origin: 'xml' | 'manual' | 'demo';
  warnings: string[];
}

// ─── Parameters (auto-generated UI) ─────────────────────────────

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export type ParamDef =
  | { key: string; label: string; type: 'range'; min: number; max: number; step?: number; unit?: string; help?: string }
  | { key: string; label: string; type: 'color'; help?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; help?: string }
  | { key: string; label: string; type: 'toggle'; help?: string }
  | { key: string; label: string; type: 'text'; placeholder?: string; help?: string };

// ─── Scene state (what gets rendered) ───────────────────────────

export type ViewMode = 'input' | 'output';
export type PatternScope = 'slice' | 'comp';

export type Anchor = 'tl' | 'tc' | 'tr' | 'cl' | 'c' | 'cr' | 'bl' | 'bc' | 'br';

export type LogoAnim = 'none' | 'pulse' | 'rotate' | 'bounce' | 'float' | 'fade' | 'dvd' | 'glitch' | 'flip' | 'orbit';

export interface LogoLayer {
  id: string;
  name: string;
  enabled: boolean;
  assetId: string | null;
  target: 'each' | 'comp' | 'pick';
  sliceIds: string[];
  anchor: Anchor;
  offsetX: number;       // % of target width
  offsetY: number;       // % of target height
  margin: number;        // % of target min side
  size: number;          // % of reference side
  sizeRef: 'min' | 'width' | 'height';
  opacity: number;       // 0-100
  rotation: number;      // degrees
  flipX: boolean;
  blend: GlobalCompositeOperation;
  colorMode: 'original' | 'tint' | 'white' | 'black' | 'invert' | 'slice';
  tint: string;
  shadow: boolean;
  shadowBlur: number;    // % of logo height
  shadowOpacity: number; // 0-100
  plate: boolean;
  plateColor: string;
  plateOpacity: number;  // 0-100
  platePadding: number;  // % of logo height
  plateRadius: number;   // % of plate height
  tile: boolean;
  tileGap: number;       // % of logo size
  tileAngle: number;     // degrees
  tileStagger: boolean;
  anim: LogoAnim;
  animCycles: number;    // whole cycles per loop → seamless
  animAmount: number;    // 0-100
}

export interface LayerState { enabled: boolean; params: Params }

export interface SceneState {
  deco: import('../render/deco').DecoState;
  patternId: string;
  patternScope: PatternScope;
  patternParams: Record<string, Params>;
  overlays: Record<string, LayerState>;
  anims: Record<string, LayerState>;
  logos: LogoLayer[];
  themeId: string;
  transparentBg: boolean;
  loopSeconds: number;
  fps: number;
  showTitle: string;
}

export interface Preset {
  name: string;
  savedAt: string;
  scene: SceneState;
}

// ─── Render environment ─────────────────────────────────────────

export interface LoopTime {
  frame: number;
  frames: number;
  fps: number;
  /** 0..1 over the loop; every animation uses whole cycles of it. */
  phase: number;
  seconds: number;
}

export interface Theme {
  id: string;
  name: string;
  desc: string;
  bg: string;
  fg: string;
  dim: string;
  accent: string;
  font: string;
  mono: string;
  hues: number[];
  sat: number;
  light: number;
  post?: (ctx: CanvasRenderingContext2D, r: Rect) => void;
  bars?: string[];
}

/** Everything a pattern, overlay or animation needs to draw one target. */
export interface DrawTarget {
  w: number;
  h: number;
  index: number;
  slice: Slice | null;     // null in composition scope
  color: string;
  colorDark: string;
  label: string;
  theme: Theme;
  setup: Setup;
  /** Size of one composition pixel on the render canvas (preview scale). */
  px: number;
  /** Frame origin in composition space (for composition-aligned grids). */
  origin: Pt;
  angle: number;
}

export interface LayerDef {
  id: string;
  name: string;
  desc: string;
  params: ParamDef[];
  defaults: Params;
}

export interface PatternDef extends LayerDef {
  category: string;
  /** Pixel-exact patterns look wrong when the preview is scaled down. */
  pixelExact?: boolean;
  draw(ctx: CanvasRenderingContext2D, t: DrawTarget, p: Params): void;
}

export interface OverlayDef extends LayerDef {
  scope: 'slice' | 'comp';
  draw(ctx: CanvasRenderingContext2D, t: DrawTarget, p: Params, all: DrawTarget[]): void;
}

export interface AnimDef extends LayerDef {
  scope: 'slice' | 'comp';
  draw(ctx: CanvasRenderingContext2D, t: DrawTarget, p: Params, time: LoopTime, all: DrawTarget[]): void;
}
