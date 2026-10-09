import { FrameData } from '../types';

export interface SlicingAnalysis {
  isValid: boolean;
  isEvenlyDivisible: boolean;
  error?: string;
  warning?: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  remainderX: number;
  remainderY: number;
}

export function analyzeSlicing(
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  rows: number
): SlicingAnalysis {
  if (!Number.isInteger(columns) || columns <= 0) {
    return {
      isValid: false,
      isEvenlyDivisible: false,
      error: 'Columns must be a positive integer greater than 0.',
      frameWidth: 0,
      frameHeight: 0,
      totalFrames: 0,
      remainderX: 0,
      remainderY: 0,
    };
  }

  if (!Number.isInteger(rows) || rows <= 0) {
    return {
      isValid: false,
      isEvenlyDivisible: false,
      error: 'Rows must be a positive integer greater than 0.',
      frameWidth: 0,
      frameHeight: 0,
      totalFrames: 0,
      remainderX: 0,
      remainderY: 0,
    };
  }

  if (columns > sourceWidth) {
    return {
      isValid: false,
      isEvenlyDivisible: false,
      error: `Columns (${columns}) cannot exceed image width (${sourceWidth}px).`,
      frameWidth: 0,
      frameHeight: 0,
      totalFrames: 0,
      remainderX: 0,
      remainderY: 0,
    };
  }

  if (rows > sourceHeight) {
    return {
      isValid: false,
      isEvenlyDivisible: false,
      error: `Rows (${rows}) cannot exceed image height (${sourceHeight}px).`,
      frameWidth: 0,
      frameHeight: 0,
      totalFrames: 0,
      remainderX: 0,
      remainderY: 0,
    };
  }

  const remainderX = sourceWidth % columns;
  const remainderY = sourceHeight % rows;
  const isEvenlyDivisible = remainderX === 0 && remainderY === 0;

  const frameWidth = Math.floor(sourceWidth / columns);
  const frameHeight = Math.floor(sourceHeight / rows);
  const totalFrames = columns * rows;

  let warning: string | undefined;
  if (!isEvenlyDivisible) {
    const parts: string[] = [];
    if (remainderX !== 0) {
      parts.push(`width has ${remainderX}px unallocated (${sourceWidth}px ÷ ${columns} = ${frameWidth}px/frame)`);
    }
    if (remainderY !== 0) {
      parts.push(`height has ${remainderY}px unallocated (${sourceHeight}px ÷ ${rows} = ${frameHeight}px/frame)`);
    }
    warning = `Warning: Dimensions are not evenly divisible: ${parts.join(', ')}. Slicing will use uniform ${frameWidth}×${frameHeight}px cells starting from top-left.`;
  }

  return {
    isValid: true,
    isEvenlyDivisible,
    warning,
    frameWidth,
    frameHeight,
    totalFrames,
    remainderX,
    remainderY,
  };
}

export function sliceSpriteSheet(
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  rows: number,
  existingOffsets?: Map<number, { x: number; y: number }>
): { frames: FrameData[]; frameWidth: number; frameHeight: number } {
  const analysis = analyzeSlicing(sourceWidth, sourceHeight, columns, rows);
  if (!analysis.isValid) {
    throw new Error(analysis.error || 'Invalid slicing parameters');
  }

  const { frameWidth, frameHeight } = analysis;
  const frames: FrameData[] = [];
  let idCounter = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const sourceX = c * frameWidth;
      const sourceY = r * frameHeight;
      const savedOffset = existingOffsets?.get(idCounter) || { x: 0, y: 0 };

      frames.push({
        id: idCounter,
        sourceX,
        sourceY,
        width: frameWidth,
        height: frameHeight,
        canvasWidth: frameWidth,
        canvasHeight: frameHeight,
        offsetX: savedOffset.x,
        offsetY: savedOffset.y,
      });

      idCounter++;
    }
  }

  return {
    frames,
    frameWidth,
    frameHeight,
  };
}

/**
 * Computes default evenly spaced cut divider positions.
 * E.g., for totalSize 1000 and count 4, returns [250, 500, 750].
 */
export function getDefaultCutPositions(totalSize: number, count: number): number[] {
  if (count <= 1) return [];
  const cuts: number[] = [];
  for (let i = 1; i < count; i++) {
    cuts.push(Math.round((totalSize * i) / count));
  }
  return cuts;
}

/**
 * Computes default evenly spaced cut divider positions for each row independently.
 */
export function getDefaultRowXCutPositions(totalWidth: number, columns: number, rows: number): number[][] {
  const defaultCuts = getDefaultCutPositions(totalWidth, columns);
  const result: number[][] = [];
  for (let r = 0; r < rows; r++) {
    result.push([...defaultCuts]);
  }
  return result;
}

/**
 * Slices sprite sheet using custom manual cut lines.
 * Supports independent per-row vertical divider cut positions (rowXCutPositions: number[][]).
 */
export function sliceSpriteSheetManual(
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  rows: number,
  xCutPositions: number[] | number[][],
  yCutPositions: number[],
  canvasSizeMode: 'uniform' | 'exact' = 'uniform',
  existingOffsets?: Map<number, { x: number; y: number }>
): {
  frames: FrameData[];
  frameWidth: number;
  frameHeight: number;
  maxCellWidth: number;
  maxCellHeight: number;
} {
  // Normalize rowXCutPositions: number[][]
  let rowXCuts: number[][] = [];
  if (Array.isArray(xCutPositions) && xCutPositions.length > 0 && Array.isArray(xCutPositions[0])) {
    rowXCuts = (xCutPositions as number[][]).map((row) => [...row].sort((a, b) => a - b));
  } else if (Array.isArray(xCutPositions)) {
    const sorted = [...(xCutPositions as number[])].sort((a, b) => a - b);
    for (let r = 0; r < rows; r++) {
      rowXCuts.push([...sorted]);
    }
  } else {
    rowXCuts = getDefaultRowXCutPositions(sourceWidth, columns, rows);
  }

  // Ensure rowXCuts has an entry for each row
  while (rowXCuts.length < rows) {
    rowXCuts.push(getDefaultCutPositions(sourceWidth, columns));
  }

  const sortedY = [...yCutPositions].sort((a, b) => a - b);
  const yBounds = [0, ...sortedY, sourceHeight];

  // Calculate cell widths and heights across all rows
  const allCellWidths: number[] = [];
  const rowHeights: number[] = [];

  for (let r = 0; r < rows; r++) {
    const h = Math.max(1, (yBounds[r + 1] ?? sourceHeight) - (yBounds[r] ?? 0));
    rowHeights.push(h);

    const rowCuts = rowXCuts[r] || getDefaultCutPositions(sourceWidth, columns);
    const sortedRowX = [...rowCuts].sort((a, b) => a - b);
    const rowXBounds = [0, ...sortedRowX, sourceWidth];

    for (let c = 0; c < columns; c++) {
      const w = Math.max(1, (rowXBounds[c + 1] ?? sourceWidth) - (rowXBounds[c] ?? 0));
      allCellWidths.push(w);
    }
  }

  const maxCellWidth = Math.max(...allCellWidths, 1);
  const maxCellHeight = Math.max(...rowHeights, 1);

  const frames: FrameData[] = [];
  let idCounter = 1;

  for (let r = 0; r < rows; r++) {
    const sY = yBounds[r] ?? 0;
    const sliceH = rowHeights[r];

    const rowCuts = rowXCuts[r] || getDefaultCutPositions(sourceWidth, columns);
    const sortedRowX = [...rowCuts].sort((a, b) => a - b);
    const rowXBounds = [0, ...sortedRowX, sourceWidth];

    for (let c = 0; c < columns; c++) {
      const sX = rowXBounds[c] ?? 0;
      const sliceW = Math.max(1, (rowXBounds[c + 1] ?? sourceWidth) - (rowXBounds[c] ?? 0));
      const savedOffset = existingOffsets?.get(idCounter) || { x: 0, y: 0 };

      const cW = canvasSizeMode === 'uniform' ? maxCellWidth : sliceW;
      const cH = canvasSizeMode === 'uniform' ? maxCellHeight : sliceH;

      frames.push({
        id: idCounter,
        sourceX: sX,
        sourceY: sY,
        width: sliceW,
        height: sliceH,
        canvasWidth: cW,
        canvasHeight: cH,
        offsetX: savedOffset.x,
        offsetY: savedOffset.y,
      });

      idCounter++;
    }
  }

  return {
    frames,
    frameWidth: maxCellWidth,
    frameHeight: maxCellHeight,
    maxCellWidth,
    maxCellHeight,
  };
}
