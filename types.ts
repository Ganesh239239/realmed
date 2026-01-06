export interface Adjustments {
  brightness: number; // 0 to 200, default 100
  contrast: number;   // 0 to 200, default 100
  saturation: number; // 0 to 200, default 100
  blur: number;       // 0 to 20, default 0
  grayscale: number;  // 0 to 100, default 0
  sepia: number;      // 0 to 100, default 0
  hue: number;        // 0 to 360, default 0
}

export type ToolType = 'adjust' | 'filters' | 'ai-magic' | 'text' | 'stickers' | 'crop' | 'rotate' | 'remove-bg';

export type OverlayType = 'image' | 'text' | 'sticker';

export interface Overlay {
  id: string;
  type: OverlayType;
  content: string; // Image URL or Text string
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale: number;
  rotation: number; // degrees
  color?: string; // for text
}

export interface FilterPreset {
  name: string;
  adjustments: Partial<Adjustments>;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hue: 0,
};

export interface EditorState {
  imageSrc: string | null;
  history: string[]; // History of imageSrc (base64)
  historyIndex: number;
  adjustments: Adjustments;
  isLoading: boolean;
  activeTool: ToolType;
}