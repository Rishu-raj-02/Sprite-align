export interface FrameData {
  id: number; // 1-indexed (Frame 1, Frame 2, ...)
  sourceX: number;
  sourceY: number;
  width: number;
  height: number;
  canvasWidth?: number; // Target frame canvas width (for alignment and export)
  canvasHeight?: number; // Target frame canvas height (for alignment and export)
  offsetX: number;
  offsetY: number;
}

export interface EditorSettings {
  previousFrameOpacity: number; // 0 to 1
  currentFrameOpacity: number; // 0 to 1
  showPreviousFrame: boolean;
  showGrid: boolean;
  showGuides: boolean;
  gridSize: number; // default 16 or 32
  zoom: number; // 0.25 to 8
  panX: number;
  panY: number;
}

export interface PreviewSettings {
  fps: number;
  loop: boolean;
  playing: boolean;
}

export interface ProjectState {
  filename: string;
  sourceImage: string; // Data URL of the original image
  sourceWidth: number;
  sourceHeight: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  slicingMode?: 'equal' | 'manual';
  xCutPositions?: number[]; // Vertical divider X positions (legacy/fallback)
  rowXCutPositions?: number[][]; // Independent vertical divider X positions for each row
  yCutPositions?: number[]; // Horizontal divider Y positions
  canvasSizeMode?: 'uniform' | 'exact';
  frames: FrameData[];
  selectedFrameIndex: number; // 0-indexed
  editorSettings: EditorSettings;
  previewSettings: PreviewSettings;
}

export interface ProjectFileFormat {
  version: string;
  projectName: string;
  filename: string;
  sourceImageDataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  slicingMode?: 'equal' | 'manual';
  xCutPositions?: number[];
  rowXCutPositions?: number[][];
  yCutPositions?: number[];
  canvasSizeMode?: 'uniform' | 'exact';
  frames: {
    id: number;
    sourceX: number;
    sourceY: number;
    width: number;
    height: number;
    canvasWidth?: number;
    canvasHeight?: number;
    offsetX: number;
    offsetY: number;
  }[];
  editorSettings: EditorSettings;
  previewSettings: PreviewSettings;
}
