import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Grid3X3, 
  Scissors, 
  AlertTriangle, 
  Check, 
  X, 
  RotateCcw, 
  Sliders, 
  Layers, 
  MoveVertical, 
  MoveHorizontal,
  Link,
  Unlink,
  Copy
} from 'lucide-react';
import { 
  analyzeSlicing, 
  SlicingAnalysis, 
  getDefaultCutPositions,
  getDefaultRowXCutPositions
} from '../utils/spriteSlicer';

export interface SlicingConfig {
  mode: 'equal' | 'manual';
  columns: number;
  rows: number;
  xCutPositions?: number[]; // Legacy single list
  rowXCutPositions?: number[][]; // Independent vertical divider X positions for each row
  yCutPositions?: number[];
  canvasSizeMode?: 'uniform' | 'exact';
}

interface SliceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage: string;
  sourceWidth: number;
  sourceHeight: number;
  filename: string;
  initialColumns: number;
  initialRows: number;
  initialMode?: 'equal' | 'manual';
  initialXCutPositions?: number[];
  initialRowXCutPositions?: number[][];
  initialYCutPositions?: number[];
  initialCanvasSizeMode?: 'uniform' | 'exact';
  onApplySlicing: (config: SlicingConfig) => void;
}

export const SliceModal: React.FC<SliceModalProps> = ({
  isOpen,
  onClose,
  sourceImage,
  sourceWidth,
  sourceHeight,
  filename: _filename,
  initialColumns,
  initialRows,
  initialMode = 'equal',
  initialXCutPositions,
  initialRowXCutPositions,
  initialYCutPositions,
  initialCanvasSizeMode = 'uniform',
  onApplySlicing,
}) => {
  // Slicing Mode: 'equal' or 'manual'
  const [mode, setMode] = useState<'equal' | 'manual'>(initialMode);
  const [cols, setCols] = useState<number>(initialColumns);
  const [rows, setRows] = useState<number>(initialRows);
  const [canvasSizeMode, setCanvasSizeMode] = useState<'uniform' | 'exact'>(initialCanvasSizeMode);

  // Link vertical cuts across rows (false = completely independent per-row vertical lines)
  const [linkColumnsAcrossRows, setLinkColumnsAcrossRows] = useState<boolean>(false);

  // Active selected row tab in fine-tuning panel
  const [activeRowTab, setActiveRowTab] = useState<number>(0);

  // Horizontal cut lines (Y coordinates dividing rows)
  const [yCutPositions, setYCutPositions] = useState<number[]>(() => {
    if (initialYCutPositions && initialYCutPositions.length === initialRows - 1) {
      return [...initialYCutPositions];
    }
    return getDefaultCutPositions(sourceHeight, initialRows);
  });

  // Independent vertical cut lines for each row (rowXCutPositions[r] = array of X cuts for row r)
  const [rowXCutPositions, setRowXCutPositions] = useState<number[][]>(() => {
    if (initialRowXCutPositions && initialRowXCutPositions.length === initialRows) {
      return initialRowXCutPositions.map((row) => [...row]);
    }
    if (initialXCutPositions && initialXCutPositions.length === initialColumns - 1) {
      const res: number[][] = [];
      for (let r = 0; r < initialRows; r++) {
        res.push([...initialXCutPositions]);
      }
      return res;
    }
    return getDefaultRowXCutPositions(sourceWidth, initialColumns, initialRows);
  });

  // Dragging / Hover state on canvas
  // type can be 'horizontal' (row line) or 'vertical' (cut line in row `rowIndex` at col `colIndex`)
  const [hoveredLine, setHoveredLine] = useState<{
    type: 'horizontal' | 'vertical';
    index?: number;
    rowIndex?: number;
    colIndex?: number;
  } | null>(null);

  const [activeDragLine, setActiveDragLine] = useState<{
    type: 'horizontal' | 'vertical';
    index?: number;
    rowIndex?: number;
    colIndex?: number;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Equal division analysis
  const [analysis, setAnalysis] = useState<SlicingAnalysis>(() =>
    analyzeSlicing(sourceWidth, sourceHeight, initialColumns, initialRows)
  );

  // Sync state on modal open
  useEffect(() => {
    if (isOpen) {
      setCols(initialColumns);
      setRows(initialRows);
      setMode(initialMode);
      setCanvasSizeMode(initialCanvasSizeMode);
      setActiveRowTab(0);

      const defaultY = initialYCutPositions && initialYCutPositions.length === initialRows - 1
        ? [...initialYCutPositions]
        : getDefaultCutPositions(sourceHeight, initialRows);
      setYCutPositions(defaultY);

      let initialRowXCuts: number[][];
      if (initialRowXCutPositions && initialRowXCutPositions.length === initialRows) {
        initialRowXCuts = initialRowXCutPositions.map((row) => [...row]);
      } else if (initialXCutPositions && initialXCutPositions.length === initialColumns - 1) {
        initialRowXCuts = [];
        for (let r = 0; r < initialRows; r++) {
          initialRowXCuts.push([...initialXCutPositions]);
        }
      } else {
        initialRowXCuts = getDefaultRowXCutPositions(sourceWidth, initialColumns, initialRows);
      }
      setRowXCutPositions(initialRowXCuts);
    }
  }, [isOpen, initialColumns, initialRows, initialMode, initialXCutPositions, initialRowXCutPositions, initialYCutPositions, initialCanvasSizeMode, sourceWidth, sourceHeight]);

  // Recompute equal analysis
  useEffect(() => {
    if (sourceWidth > 0 && sourceHeight > 0) {
      setAnalysis(analyzeSlicing(sourceWidth, sourceHeight, cols, rows));
    }
  }, [cols, rows, sourceWidth, sourceHeight]);

  // Adjust cut positions array when cols or rows change
  const handleSetColumns = (newCols: number) => {
    const validCols = Math.max(1, Math.min(sourceWidth, newCols));
    setCols(validCols);
    setRowXCutPositions(getDefaultRowXCutPositions(sourceWidth, validCols, rows));
  };

  const handleSetRows = (newRows: number) => {
    const validRows = Math.max(1, Math.min(sourceHeight, newRows));
    setRows(validRows);
    setYCutPositions(getDefaultCutPositions(sourceHeight, validRows));
    setRowXCutPositions(getDefaultRowXCutPositions(sourceWidth, cols, validRows));
    if (activeRowTab >= validRows) {
      setActiveRowTab(0);
    }
  };

  // Reset lines to equal
  const handleResetToEqual = () => {
    setYCutPositions(getDefaultCutPositions(sourceHeight, rows));
    setRowXCutPositions(getDefaultRowXCutPositions(sourceWidth, cols, rows));
  };

  // Copy cuts from one row to another or all rows
  const handleCopyRowCuts = (fromRow: number, toRow?: number) => {
    setRowXCutPositions((prev) => {
      const sourceCuts = prev[fromRow] || getDefaultCutPositions(sourceWidth, cols);
      if (toRow !== undefined) {
        const next = [...prev];
        next[toRow] = [...sourceCuts];
        return next;
      }
      // Copy to all rows
      return prev.map(() => [...sourceCuts]);
    });
  };

  // Reset single row
  const handleResetSingleRow = (rowIdx: number) => {
    setRowXCutPositions((prev) => {
      const next = [...prev];
      next[rowIdx] = getDefaultCutPositions(sourceWidth, cols);
      return next;
    });
  };

  // Load source image once
  useEffect(() => {
    if (!sourceImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      drawPreview();
    };
    img.src = sourceImage;
  }, [sourceImage]);

  // Calculate cell boundaries for all rows & columns
  const getCellBoundaries = useCallback(() => {
    let currentYCut: number[] = [];
    if (mode === 'manual') {
      currentYCut = [...yCutPositions].sort((a, b) => a - b);
    } else {
      currentYCut = getDefaultCutPositions(sourceHeight, rows);
    }
    const yBounds = [0, ...currentYCut, sourceHeight];

    const rowHeights: number[] = [];
    for (let r = 0; r < rows; r++) {
      rowHeights.push(Math.max(1, (yBounds[r + 1] ?? sourceHeight) - (yBounds[r] ?? 0)));
    }

    // Row-specific X boundaries: rowXBounds[r] is [0, cut1, cut2, ..., sourceWidth]
    const rowXBounds: number[][] = [];
    const rowColWidths: number[][] = [];

    for (let r = 0; r < rows; r++) {
      let rCuts: number[] = [];
      if (mode === 'manual' && rowXCutPositions[r]) {
        rCuts = [...rowXCutPositions[r]].sort((a, b) => a - b);
      } else {
        rCuts = getDefaultCutPositions(sourceWidth, cols);
      }
      const xB = [0, ...rCuts, sourceWidth];
      rowXBounds.push(xB);

      const cWidths: number[] = [];
      for (let c = 0; c < cols; c++) {
        cWidths.push(Math.max(1, (xB[c + 1] ?? sourceWidth) - (xB[c] ?? 0)));
      }
      rowColWidths.push(cWidths);
    }

    return { yBounds, rowHeights, rowXBounds, rowColWidths };
  }, [mode, yCutPositions, rowXCutPositions, sourceWidth, sourceHeight, cols, rows]);

  // Main draw preview function
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img || !isOpen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Display scale to fit within preview viewport
    const maxW = 600;
    const maxH = 320;
    const scale = Math.min(maxW / sourceWidth, maxH / sourceHeight, 1);
    const displayW = Math.round(sourceWidth * scale);
    const displayH = Math.round(sourceHeight * scale);

    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }

    const scaleX = displayW / sourceWidth;
    const scaleY = displayH / sourceHeight;

    // 1. Transparency Checkerboard
    ctx.clearRect(0, 0, displayW, displayH);
    const checkSize = 10;
    for (let y = 0; y < displayH; y += checkSize) {
      for (let x = 0; x < displayW; x += checkSize) {
        ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#1c212c' : '#141820';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // 2. Source Image
    ctx.drawImage(img, 0, 0, displayW, displayH);

    const { yBounds, rowHeights, rowXBounds, rowColWidths } = getCellBoundaries();

    // 3. Draw Row Shading & Frame Badges
    let frameId = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      const topY = Math.round((yBounds[r] ?? 0) * scaleY);
      const botY = Math.round((yBounds[r + 1] ?? sourceHeight) * scaleY);
      const cellH = botY - topY;
      const xB = rowXBounds[r] || [0, sourceWidth];
      const colW = rowColWidths[r] || [];

      for (let c = 0; c < cols; c++) {
        const leftX = Math.round((xB[c] ?? 0) * scaleX);
        const rightX = Math.round((xB[c + 1] ?? sourceWidth) * scaleX);
        const cellW = rightX - leftX;

        const centerX = Math.round(leftX + cellW / 2);
        const centerY = Math.round(topY + cellH / 2);

        // Frame number & dimension badge
        const badgeW = Math.min(cellW - 6, 56);
        const badgeH = 22;

        if (cellW > 34 && cellH > 22) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(centerX - badgeW / 2, centerY - badgeH / 2, badgeW, badgeH);

          ctx.strokeStyle = r % 2 === 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(168, 85, 247, 0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(centerX - badgeW / 2, centerY - badgeH / 2, badgeW, badgeH);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`F${frameId}`, centerX, centerY - 3);

          ctx.fillStyle = r % 2 === 0 ? '#7dd3fc' : '#d8b4fe';
          ctx.font = '9px monospace';
          ctx.fillText(`${colW[c] || 0}×${rowHeights[r] || 0}`, centerX, centerY + 6);
        }

        frameId++;
      }
    }

    // 4. Draw Horizontal Cut Lines (Rows)
    for (let r = 0; r < yBounds.length - 2; r++) {
      const linePosImg = mode === 'manual' ? yCutPositions[r] : Math.round((sourceHeight * (r + 1)) / rows);
      const lineY = Math.round(linePosImg * scaleY);
      const isHovered = mode === 'manual' && hoveredLine?.type === 'horizontal' && hoveredLine.index === r;
      const isActive = mode === 'manual' && activeDragLine?.type === 'horizontal' && activeDragLine.index === r;

      if (isHovered || isActive) {
        // Vibrant glowing highlight
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(displayW, lineY);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(displayW, lineY);
        ctx.stroke();

        // Drag pill handle
        const handleX = displayW / 2;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(handleX - 32, lineY - 10, 64, 20);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`↕ Row Line ${r + 1}`, handleX, lineY + 1);
        ctx.restore();
      } else {
        // Standard dashed cut line with high visibility
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(displayW, lineY);
        ctx.stroke();

        // Small indicator badge on the right edge
        ctx.fillStyle = 'rgba(14, 165, 233, 0.85)';
        ctx.fillRect(displayW - 24, lineY - 8, 24, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`Y${r + 1}`, displayW - 12, lineY + 1);
        ctx.restore();
      }
    }

    // 5. Draw SEPARATE Vertical Cut Lines FOR EACH ROW (Independent vertical lines)
    for (let r = 0; r < rows; r++) {
      const topY = Math.round((yBounds[r] ?? 0) * scaleY);
      const botY = Math.round((yBounds[r + 1] ?? sourceHeight) * scaleY);
      const rCuts = mode === 'manual' && rowXCutPositions[r]
        ? rowXCutPositions[r]
        : getDefaultCutPositions(sourceWidth, cols);

      for (let c = 0; c < rCuts.length; c++) {
        const linePosImg = rCuts[c];
        const lineX = Math.round(linePosImg * scaleX);

        const isHovered = mode === 'manual' && 
          hoveredLine?.type === 'vertical' && 
          hoveredLine.rowIndex === r && 
          hoveredLine.colIndex === c;

        const isActive = mode === 'manual' && 
          activeDragLine?.type === 'vertical' && 
          activeDragLine.rowIndex === r && 
          activeDragLine.colIndex === c;

        if (isHovered || isActive) {
          // Vibrant glowing highlight for this row's segment
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(lineX, topY);
          ctx.lineTo(lineX, botY);
          ctx.stroke();

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(lineX, topY);
          ctx.lineTo(lineX, botY);
          ctx.stroke();

          // Drag pill handle in center of this specific row
          const handleY = Math.round(topY + (botY - topY) / 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(lineX - 24, handleY - 10, 48, 20);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`R${r + 1} C${c + 1}`, lineX, handleY + 1);
          ctx.restore();
        } else {
          // Distinct color per row so user can clearly see separate row cuts
          const strokeColor = r % 2 === 0 ? '#38bdf8' : '#c084fc';
          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(lineX, topY);
          ctx.lineTo(lineX, botY);
          ctx.stroke();

          // Small tag at top of row segment
          ctx.fillStyle = r % 2 === 0 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(192, 132, 252, 0.8)';
          ctx.fillRect(lineX - 10, topY + 2, 20, 11);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(`R${r + 1}`, lineX, topY + 8);
          ctx.restore();
        }
      }
    }
  }, [
    isOpen,
    sourceWidth,
    sourceHeight,
    cols,
    rows,
    mode,
    yCutPositions,
    rowXCutPositions,
    hoveredLine,
    activeDragLine,
    getCellBoundaries,
  ]);

  // Redraw when state updates
  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Mouse / Pointer Event Handlers for Draggable Cut Lines on Canvas
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual') return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const imgScaleX = canvas.width / sourceWidth;
    const imgScaleY = canvas.height / sourceHeight;

    const hitThreshold = 10; // pixels

    // 1. Check Horizontal lines first (priority on row division lines)
    for (let r = 0; r < yCutPositions.length; r++) {
      const lineY = Math.round(yCutPositions[r] * imgScaleY);
      if (Math.abs(canvasY - lineY) <= hitThreshold) {
        setActiveDragLine({ type: 'horizontal', index: r });
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 2. Check Vertical lines inside the specific row the pointer is currently on
    const yBounds = [0, ...yCutPositions, sourceHeight];
    for (let r = 0; r < rows; r++) {
      const topY = Math.round((yBounds[r] ?? 0) * imgScaleY);
      const botY = Math.round((yBounds[r + 1] ?? sourceHeight) * imgScaleY);

      if (canvasY >= topY - 3 && canvasY <= botY + 3) {
        const rCuts = rowXCutPositions[r] || [];
        for (let c = 0; c < rCuts.length; c++) {
          const lineX = Math.round(rCuts[c] * imgScaleX);
          if (Math.abs(canvasX - lineX) <= hitThreshold) {
            setActiveDragLine({ type: 'vertical', rowIndex: r, colIndex: c });
            setActiveRowTab(r); // Auto-focus fine-tuning tab to this row
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual') return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const imgScaleX = canvas.width / sourceWidth;
    const imgScaleY = canvas.height / sourceHeight;

    // A. If currently dragging a line:
    if (activeDragLine) {
      if (activeDragLine.type === 'horizontal' && activeDragLine.index !== undefined) {
        const rawY = Math.round(canvasY / imgScaleY);
        const idx = activeDragLine.index;
        const minY = (idx > 0 ? yCutPositions[idx - 1] : 0) + 15;
        const maxY = (idx < yCutPositions.length - 1 ? yCutPositions[idx + 1] : sourceHeight) - 15;
        const clampedY = Math.max(minY, Math.min(maxY, rawY));

        setYCutPositions((prev) => {
          const next = [...prev];
          next[idx] = clampedY;
          return next;
        });
      } else if (
        activeDragLine.type === 'vertical' && 
        activeDragLine.rowIndex !== undefined && 
        activeDragLine.colIndex !== undefined
      ) {
        const r = activeDragLine.rowIndex;
        const c = activeDragLine.colIndex;
        const rawX = Math.round(canvasX / imgScaleX);
        const rCuts = rowXCutPositions[r] || [];
        const minX = (c > 0 ? rCuts[c - 1] : 0) + 15;
        const maxX = (c < rCuts.length - 1 ? rCuts[c + 1] : sourceWidth) - 15;
        const clampedX = Math.max(minX, Math.min(maxX, rawX));

        setRowXCutPositions((prev) => {
          const next = prev.map((rowArr) => [...rowArr]);
          if (linkColumnsAcrossRows) {
            // Update all rows together
            for (let rowIdx = 0; rowIdx < next.length; rowIdx++) {
              if (next[rowIdx]) {
                const rowMin = (c > 0 ? next[rowIdx][c - 1] : 0) + 15;
                const rowMax = (c < next[rowIdx].length - 1 ? next[rowIdx][c + 1] : sourceWidth) - 15;
                next[rowIdx][c] = Math.max(rowMin, Math.min(rowMax, rawX));
              }
            }
          } else {
            // Update ONLY this specific row independently!
            if (next[r]) {
              next[r][c] = clampedX;
            }
          }
          return next;
        });
      }
      return;
    }

    // B. If hovering, detect nearest line for cursor and visual feedback:
    const hitThreshold = 8;
    let foundHover: {
      type: 'horizontal' | 'vertical';
      index?: number;
      rowIndex?: number;
      colIndex?: number;
    } | null = null;

    // Check horizontal lines
    for (let r = 0; r < yCutPositions.length; r++) {
      const lineY = Math.round(yCutPositions[r] * imgScaleY);
      if (Math.abs(canvasY - lineY) <= hitThreshold) {
        foundHover = { type: 'horizontal', index: r };
        break;
      }
    }

    // Check vertical lines per row
    if (!foundHover) {
      const yBounds = [0, ...yCutPositions, sourceHeight];
      for (let r = 0; r < rows; r++) {
        const topY = Math.round((yBounds[r] ?? 0) * imgScaleY);
        const botY = Math.round((yBounds[r + 1] ?? sourceHeight) * imgScaleY);

        if (canvasY >= topY - 3 && canvasY <= botY + 3) {
          const rCuts = rowXCutPositions[r] || [];
          for (let c = 0; c < rCuts.length; c++) {
            const lineX = Math.round(rCuts[c] * imgScaleX);
            if (Math.abs(canvasX - lineX) <= hitThreshold) {
              foundHover = { type: 'vertical', rowIndex: r, colIndex: c };
              break;
            }
          }
          if (foundHover) break;
        }
      }
    }

    setHoveredLine(foundHover);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeDragLine) {
      setActiveDragLine(null);
      try {
        previewCanvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // safe ignore
      }
    }
  };

  // Cursor style for canvas
  let canvasCursor = 'default';
  if (mode === 'manual') {
    if (activeDragLine?.type === 'horizontal' || hoveredLine?.type === 'horizontal') {
      canvasCursor = 'row-resize';
    } else if (activeDragLine?.type === 'vertical' || hoveredLine?.type === 'vertical') {
      canvasCursor = 'col-resize';
    }
  }

  // Preset parts selection (8 parts, 6 parts, etc.)
  const handleSelectPreset = (presetCols: number, presetRows: number) => {
    setCols(presetCols);
    setRows(presetRows);
    setActiveRowTab(0);
    setYCutPositions(getDefaultCutPositions(sourceHeight, presetRows));
    setRowXCutPositions(getDefaultRowXCutPositions(sourceWidth, presetCols, presetRows));
  };

  if (!isOpen) return null;

  const totalFrames = cols * rows;
  const { rowHeights, rowColWidths } = getCellBoundaries();

  // Find max cell dimensions across all cells
  const allWidths = rowColWidths.flat();
  const maxCellW = allWidths.length > 0 ? Math.max(...allWidths) : Math.floor(sourceWidth / cols);
  const maxCellH = rowHeights.length > 0 ? Math.max(...rowHeights) : Math.floor(sourceHeight / rows);

  const handleApply = () => {
    onApplySlicing({
      mode,
      columns: cols,
      rows,
      xCutPositions: mode === 'manual' ? (rowXCutPositions[0] || getDefaultCutPositions(sourceWidth, cols)) : undefined,
      rowXCutPositions: mode === 'manual' ? rowXCutPositions : undefined,
      yCutPositions: mode === 'manual' ? yCutPositions : undefined,
      canvasSizeMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Sprite Sheet Slicing Configuration
              </h2>
              <p className="text-xs text-neutral-400">
                Independent per-row vertical cut lines & horizontal row dividers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Slicing Mode Toggle */}
          <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            <button
              onClick={() => setMode('equal')}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                mode === 'equal'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Equal Grid (Automatic)</span>
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                mode === 'manual'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Manual Flexible Slicing (Independent Row Cuts)</span>
            </button>
          </div>

          {/* Preset Buttons for Quick Part Slicing (8 parts, 6 parts, etc.) */}
          <div className="space-y-1.5">
            <div className="text-neutral-400 text-[11px] font-medium flex items-center justify-between">
              <span>Quick Preset Slices:</span>
              <span className="text-neutral-500 font-mono">{sourceWidth} × {sourceHeight} px</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectPreset(4, 2)}
                className={`py-1.5 px-2 rounded border text-center transition cursor-pointer font-medium ${
                  cols === 4 && rows === 2
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                8 Parts (4×2)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(3, 2)}
                className={`py-1.5 px-2 rounded border text-center transition cursor-pointer font-medium ${
                  cols === 3 && rows === 2
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                6 Parts (3×2)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(8, 1)}
                className={`py-1.5 px-2 rounded border text-center transition cursor-pointer font-medium ${
                  cols === 8 && rows === 1
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                8 Parts (8×1)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(6, 1)}
                className={`py-1.5 px-2 rounded border text-center transition cursor-pointer font-medium ${
                  cols === 6 && rows === 1
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                6 Parts (6×1)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(2, 2)}
                className={`py-1.5 px-2 rounded border text-center transition cursor-pointer font-medium ${
                  cols === 2 && rows === 2
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                4 Parts (2×2)
              </button>
            </div>
          </div>

          {/* Grid Size Inputs */}
          <div className="grid grid-cols-2 gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <div className="space-y-1">
              <label htmlFor="slice-cols" className="block text-neutral-300 font-medium">
                Columns per Row
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="slice-cols"
                  type="number"
                  min="1"
                  max={sourceWidth}
                  value={cols}
                  onChange={(e) => handleSetColumns(parseInt(e.target.value) || 1)}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-neutral-400 font-mono text-xs">cols</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="slice-rows" className="block text-neutral-300 font-medium">
                Rows (Horizontal Divisions)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="slice-rows"
                  type="number"
                  min="1"
                  max={sourceHeight}
                  value={rows}
                  onChange={(e) => handleSetRows(parseInt(e.target.value) || 1)}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-neutral-400 font-mono text-xs">rows</span>
              </div>
            </div>
          </div>

          {/* Slicing Preview Canvas with Interactive Dragging */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-200">Interactive Canvas Slice Lines</span>
                {mode === 'manual' && (
                  <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    Drag any row's cut line independently
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-indigo-400">
                Total Frames: {totalFrames} (F1 to F{totalFrames})
              </span>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 flex flex-col items-center justify-center overflow-hidden min-h-[220px]">
              <canvas
                ref={previewCanvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                style={{ cursor: canvasCursor }}
                className="max-h-[260px] max-w-full rounded border border-neutral-800 shadow-inner select-none touch-none"
              />
              {mode === 'manual' && (
                <div className="mt-2 text-center text-neutral-400 text-[11px] flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span>Row 1 Cut Lines</span>
                  </div>
                  {rows > 1 && (
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <span>Row 2 Cut Lines (Separate & Independent)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Horizontal Row Split</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual Cut Line Pixel Adjustments & Fine-Tuning */}
          {mode === 'manual' && (
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Manual Cut Positions & Per-Row Alignment</span>
                </div>

                <div className="flex items-center gap-2">
                  {rows > 1 && (
                    <button
                      type="button"
                      onClick={() => setLinkColumnsAcrossRows((prev) => !prev)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                        linkColumnsAcrossRows
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-600'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
                      }`}
                      title={linkColumnsAcrossRows ? "Vertical lines move together across all rows" : "Vertical lines move independently per row"}
                    >
                      {linkColumnsAcrossRows ? (
                        <>
                          <Link className="w-3 h-3 text-indigo-400" />
                          <span>Linked Rows</span>
                        </>
                      ) : (
                        <>
                          <Unlink className="w-3 h-3 text-amber-400" />
                          <span>Independent Row Cuts (Active)</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetToEqual}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    title="Reset all lines to evenly spaced positions"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All to Equal</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Dividers (Lower/Raise Row Split Lines) */}
              {yCutPositions.length > 0 && (
                <div className="space-y-2 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                    <MoveVertical className="w-3 h-3" />
                    <span>Horizontal Split Lines (Row Heights)</span>
                  </span>
                  <div className="space-y-2">
                    {yCutPositions.map((yPos, idx) => {
                      const topH = idx === 0 ? yPos : yPos - yCutPositions[idx - 1];
                      const botH = idx === yCutPositions.length - 1 ? sourceHeight - yPos : yCutPositions[idx + 1] - yPos;

                      return (
                        <div
                          key={`y-cut-${idx}`}
                          className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800 gap-3"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-neutral-200">Horizontal Line {idx + 1}:</span>
                            <span className="text-neutral-400 ml-1.5 text-[11px]">
                              Row {idx + 1} (Top): <strong className="text-neutral-200">{topH}px</strong> | Row {idx + 2} (Bottom): <strong className="text-neutral-200">{botH}px</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 font-mono">
                            <button
                              type="button"
                              onClick={() => {
                                const minY = (idx > 0 ? yCutPositions[idx - 1] : 0) + 15;
                                setYCutPositions((prev) => {
                                  const next = [...prev];
                                  next[idx] = Math.max(minY, next[idx] - 10);
                                  return next;
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                              title="Raise line by 10px"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const minY = (idx > 0 ? yCutPositions[idx - 1] : 0) + 15;
                                setYCutPositions((prev) => {
                                  const next = [...prev];
                                  next[idx] = Math.max(minY, next[idx] - 1);
                                  return next;
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                              title="Raise line by 1px"
                            >
                              -1
                            </button>

                            <input
                              type="number"
                              value={yPos}
                              min={(idx > 0 ? yCutPositions[idx - 1] : 0) + 15}
                              max={(idx < yCutPositions.length - 1 ? yCutPositions[idx + 1] : sourceHeight) - 15}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || yPos;
                                const minY = (idx > 0 ? yCutPositions[idx - 1] : 0) + 15;
                                const maxY = (idx < yCutPositions.length - 1 ? yCutPositions[idx + 1] : sourceHeight) - 15;
                                setYCutPositions((prev) => {
                                  const next = [...prev];
                                  next[idx] = Math.max(minY, Math.min(maxY, val));
                                  return next;
                                });
                              }}
                              className="w-16 text-center bg-neutral-950 border border-neutral-700 rounded px-1 py-0.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const maxY = (idx < yCutPositions.length - 1 ? yCutPositions[idx + 1] : sourceHeight) - 15;
                                setYCutPositions((prev) => {
                                  const next = [...prev];
                                  next[idx] = Math.min(maxY, next[idx] + 1);
                                  return next;
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                              title="Lower line by 1px"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const maxY = (idx < yCutPositions.length - 1 ? yCutPositions[idx + 1] : sourceHeight) - 15;
                                setYCutPositions((prev) => {
                                  const next = [...prev];
                                  next[idx] = Math.min(maxY, next[idx] + 10);
                                  return next;
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                              title="Lower line by 10px"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Independent Vertical Cut Lines Per Row */}
              {cols > 1 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1">
                      <MoveHorizontal className="w-3 h-3" />
                      <span>Independent Vertical Cut Lines per Row</span>
                    </span>
                    <span className="text-neutral-500 text-[10px]">
                      {rows > 1 ? 'Adjust each row separately if bottom frames are shifted' : ''}
                    </span>
                  </div>

                  {/* Row Selector Tabs if multiple rows */}
                  {rows > 1 && (
                    <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
                      {Array.from({ length: rows }).map((_, rIdx) => {
                        const startF = rIdx * cols + 1;
                        const endF = (rIdx + 1) * cols;
                        return (
                          <button
                            key={`row-tab-${rIdx}`}
                            type="button"
                            onClick={() => setActiveRowTab(rIdx)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                              activeRowTab === rIdx
                                ? rIdx === 0
                                  ? 'bg-sky-950 text-sky-300 border border-sky-600'
                                  : 'bg-purple-950 text-purple-300 border border-purple-600'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
                            }`}
                          >
                            <span>Row {rIdx + 1}</span>
                            <span className="text-[10px] opacity-75 font-mono">(F{startF}–F{endF})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Fine-Tuning for Selected Row */}
                  {(() => {
                    const r = rows > 1 ? activeRowTab : 0;
                    const rCuts = rowXCutPositions[r] || [];
                    const rowColW = rowColWidths[r] || [];

                    return (
                      <div className="space-y-2 bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${r === 0 ? 'text-sky-300' : 'text-purple-300'}`}>
                              Row {r + 1} Cut Positions (Frames {r * cols + 1} to {(r + 1) * cols}):
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {rows > 1 && (
                              <button
                                type="button"
                                onClick={() => handleCopyRowCuts(r)}
                                className="flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white bg-neutral-800 px-2 py-0.5 rounded transition cursor-pointer"
                                title="Apply Row cuts to all other rows"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Copy to All Rows</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleResetSingleRow(r)}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                            >
                              Reset Row {r + 1}
                            </button>
                          </div>
                        </div>

                        {/* Cut Line Inputs for this row */}
                        <div className="space-y-1.5">
                          {rCuts.map((xPos, cIdx) => {
                            const leftW = cIdx === 0 ? xPos : xPos - rCuts[cIdx - 1];
                            const rightW = cIdx === rCuts.length - 1 ? sourceWidth - xPos : rCuts[cIdx + 1] - xPos;

                            return (
                              <div
                                key={`r-${r}-cut-${cIdx}`}
                                className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800 gap-3"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold text-neutral-200">
                                    Row {r + 1} • Line {cIdx + 1}:
                                  </span>
                                  <span className="text-neutral-400 ml-1.5 text-[11px]">
                                    Col {cIdx + 1}: <strong className="text-neutral-200">{leftW}px</strong> | Col {cIdx + 2}: <strong className="text-neutral-200">{rightW}px</strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const minX = (cIdx > 0 ? rCuts[cIdx - 1] : 0) + 15;
                                      setRowXCutPositions((prev) => {
                                        const next = prev.map((arr) => [...arr]);
                                        if (next[r]) {
                                          next[r][cIdx] = Math.max(minX, next[r][cIdx] - 10);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                                    title="Shift cut 10px Left"
                                  >
                                    -10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const minX = (cIdx > 0 ? rCuts[cIdx - 1] : 0) + 15;
                                      setRowXCutPositions((prev) => {
                                        const next = prev.map((arr) => [...arr]);
                                        if (next[r]) {
                                          next[r][cIdx] = Math.max(minX, next[r][cIdx] - 1);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                                    title="Shift cut 1px Left"
                                  >
                                    -1
                                  </button>

                                  <input
                                    type="number"
                                    value={xPos}
                                    min={(cIdx > 0 ? rCuts[cIdx - 1] : 0) + 15}
                                    max={(cIdx < rCuts.length - 1 ? rCuts[cIdx + 1] : sourceWidth) - 15}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || xPos;
                                      const minX = (cIdx > 0 ? rCuts[cIdx - 1] : 0) + 15;
                                      const maxX = (cIdx < rCuts.length - 1 ? rCuts[cIdx + 1] : sourceWidth) - 15;
                                      setRowXCutPositions((prev) => {
                                        const next = prev.map((arr) => [...arr]);
                                        if (next[r]) {
                                          next[r][cIdx] = Math.max(minX, Math.min(maxX, val));
                                        }
                                        return next;
                                      });
                                    }}
                                    className={`w-16 text-center bg-neutral-950 border border-neutral-700 rounded px-1 py-0.5 text-xs font-bold focus:outline-none ${
                                      r === 0 ? 'text-sky-400 focus:border-sky-500' : 'text-purple-400 focus:border-purple-500'
                                    }`}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const maxX = (cIdx < rCuts.length - 1 ? rCuts[cIdx + 1] : sourceWidth) - 15;
                                      setRowXCutPositions((prev) => {
                                        const next = prev.map((arr) => [...arr]);
                                        if (next[r]) {
                                          next[r][cIdx] = Math.min(maxX, next[r][cIdx] + 1);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                                    title="Shift cut 1px Right"
                                  >
                                    +1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const maxX = (cIdx < rCuts.length - 1 ? rCuts[cIdx + 1] : sourceWidth) - 15;
                                      setRowXCutPositions((prev) => {
                                        const next = prev.map((arr) => [...arr]);
                                        if (next[r]) {
                                          next[r][cIdx] = Math.min(maxX, next[r][cIdx] + 10);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition cursor-pointer"
                                    title="Shift cut 10px Right"
                                  >
                                    +10
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Row Cell Width Summary */}
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 flex-wrap pt-1 font-mono">
                          <span>Frame Widths for Row {r + 1}:</span>
                          {rowColW.map((w, i) => (
                            <span key={`rcw-${i}`} className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">
                              F{r * cols + i + 1}: {w}px
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Frame Canvas Sizing Strategy */}
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Frame Canvas Size for Alignment & Animation</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                onClick={() => setCanvasSizeMode('uniform')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition cursor-pointer ${
                  canvasSizeMode === 'uniform'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="canvas-size-mode"
                  checked={canvasSizeMode === 'uniform'}
                  onChange={() => setCanvasSizeMode('uniform')}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <strong className="block text-neutral-200 text-xs">
                    Uniform Canvas ({maxCellW} × {maxCellH} px)
                  </strong>
                  <span className="text-[10px] text-neutral-400 leading-tight block mt-0.5">
                    Recommended. Sizes all frames to match the largest cut cell. Ensures stable animation preview and clean sprite sheet exports.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setCanvasSizeMode('exact')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition cursor-pointer ${
                  canvasSizeMode === 'exact'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="canvas-size-mode"
                  checked={canvasSizeMode === 'exact'}
                  onChange={() => setCanvasSizeMode('exact')}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <strong className="block text-neutral-200 text-xs">
                    Exact Sliced Dimensions
                  </strong>
                  <span className="text-[10px] text-neutral-400 leading-tight block mt-0.5">
                    Each frame has its own cut dimensions based on its row and column slice widths.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Divisibility / Warning notice if equal mode has remainders */}
          {mode === 'equal' && analysis.warning && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span>{analysis.warning}</span>
                <span className="block mt-1 text-amber-400">
                  Tip: Switch to <strong>Manual Flexible Slicing</strong> to adjust top and bottom row lines independently without clipping.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-900/80">
          <div className="text-xs text-neutral-400">
            Output: <strong className="text-neutral-200">{totalFrames} frames</strong>
            {mode === 'manual' ? (
              <span className="text-amber-400 font-medium ml-1.5">• Independent Cuts Active</span>
            ) : (
              <span className="text-indigo-400 font-medium ml-1.5">• Equal Grid ({analysis.frameWidth}×{analysis.frameHeight}px)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-slice"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Slice Sprite Sheet ({totalFrames} Frames)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
