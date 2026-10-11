import { Analytics } from '@vercel/analytics/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ProjectState, 
  FrameData, 
  EditorSettings, 
  PreviewSettings, 
  ProjectFileFormat 
} from './types';
import { Header } from './components/Header';
import { FrameList } from './components/FrameList';
import { EditorCanvas } from './components/EditorCanvas';
import { ControlPanel } from './components/ControlPanel';
import { AnimationPreview } from './components/AnimationPreview';
import { SliceModal, SlicingConfig } from './components/SliceModal';
import { UploadModal } from './components/UploadModal';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { loadImage, generateDemoSpriteSheet } from './utils/imageLoader';
import { sliceSpriteSheet, sliceSpriteSheetManual } from './utils/spriteSlicer';
import { HistoryTracker, OffsetAction } from './utils/history';
import { downloadBlob } from './utils/exportManager';
import { Upload, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  // History Tracker instance
  const historyRef = useRef<HistoryTracker>(new HistoryTracker(50));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Cached HTMLImageElement for fast rendering without re-decoding
  const [cachedSourceImage, setCachedSourceImage] = useState<HTMLImageElement | null>(null);

  // Modal Dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSliceOpen, setIsSliceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCanvasMaximized, setIsCanvasMaximized] = useState(false);

  // General error banner
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Initial State: Initialize with the Demo Sprite Sheet so that all 10 prompt test cases
  // can be executed and tested immediately on launch
  const [project, setProject] = useState<ProjectState>(() => {
    const demo = generateDemoSpriteSheet();
    const sliced = sliceSpriteSheet(demo.width, demo.height, demo.cols, demo.rows);

    return {
      filename: demo.name,
      sourceImage: demo.dataUrl,
      sourceWidth: demo.width,
      sourceHeight: demo.height,
      columns: demo.cols,
      rows: demo.rows,
      frameWidth: sliced.frameWidth,
      frameHeight: sliced.frameHeight,
      frames: sliced.frames,
      selectedFrameIndex: 0, // Frame 1
      editorSettings: {
        previousFrameOpacity: 0.5,
        currentFrameOpacity: 1.0,
        showPreviousFrame: true,
        showGrid: false,
        showGuides: true,
        gridSize: 32,
        zoom: 1,
        panX: 0,
        panY: 0,
      },
      previewSettings: {
        fps: 8,
        loop: true,
        playing: false,
      },
    };
  });

  // Load and cache HTMLImageElement whenever sourceImage dataUrl changes
  useEffect(() => {
    if (!project.sourceImage) {
      setCachedSourceImage(null);
      return;
    }

    let isCurrent = true;
    loadImage(project.sourceImage)
      .then((img) => {
        if (isCurrent) {
          setCachedSourceImage(img);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setGlobalError(err?.message || 'Failed to decode image.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [project.sourceImage]);

  // Update undo/redo availability state
  const syncHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  // Update offset for the selected frame
  // isFinal=false during dragging, isFinal=true on drag end / arrow press
  const handleUpdateOffset = useCallback((newX: number, newY: number, isFinal: boolean) => {
    setProject((prev) => {
      const activeFrame = prev.frames[prev.selectedFrameIndex];
      if (!activeFrame) return prev;

      if (activeFrame.offsetX === newX && activeFrame.offsetY === newY) {
        return prev;
      }

      if (isFinal) {
        // Record in history
        historyRef.current.record({
          frameId: activeFrame.id,
          prevX: activeFrame.offsetX,
          prevY: activeFrame.offsetY,
          nextX: newX,
          nextY: newY,
        });
        syncHistoryState();
      }

      const updatedFrames = prev.frames.map((f, idx) => {
        if (idx === prev.selectedFrameIndex) {
          return { ...f, offsetX: newX, offsetY: newY };
        }
        return f;
      });

      return {
        ...prev,
        frames: updatedFrames,
      };
    });
  }, [syncHistoryState]);

  // Reset selected frame position to (0, 0)
  const handleResetCurrentFrame = useCallback((frameIndexToReset?: number) => {
    setProject((prev) => {
      const idx = frameIndexToReset !== undefined ? frameIndexToReset : prev.selectedFrameIndex;
      const targetFrame = prev.frames[idx];
      if (!targetFrame) return prev;

      if (targetFrame.offsetX === 0 && targetFrame.offsetY === 0) {
        return prev;
      }

      historyRef.current.record({
        frameId: targetFrame.id,
        prevX: targetFrame.offsetX,
        prevY: targetFrame.offsetY,
        nextX: 0,
        nextY: 0,
      });
      syncHistoryState();

      const updatedFrames = prev.frames.map((f, i) => {
        if (i === idx) {
          return { ...f, offsetX: 0, offsetY: 0 };
        }
        return f;
      });

      return {
        ...prev,
        frames: updatedFrames,
      };
    });
  }, [syncHistoryState]);

  // Undo position change
  const handleUndo = useCallback(() => {
    const action = historyRef.current.undo();
    if (!action) return;

    setProject((prev) => {
      const updatedFrames = prev.frames.map((f) => {
        if (f.id === action.frameId) {
          return { ...f, offsetX: action.prevX, offsetY: action.prevY };
        }
        return f;
      });

      // Optionally select the undone frame so user sees what changed
      const targetIndex = prev.frames.findIndex((f) => f.id === action.frameId);

      return {
        ...prev,
        frames: updatedFrames,
        selectedFrameIndex: targetIndex >= 0 ? targetIndex : prev.selectedFrameIndex,
      };
    });

    syncHistoryState();
  }, [syncHistoryState]);

  // Redo position change
  const handleRedo = useCallback(() => {
    const action = historyRef.current.redo();
    if (!action) return;

    setProject((prev) => {
      const updatedFrames = prev.frames.map((f) => {
        if (f.id === action.frameId) {
          return { ...f, offsetX: action.nextX, offsetY: action.nextY };
        }
        return f;
      });

      const targetIndex = prev.frames.findIndex((f) => f.id === action.frameId);

      return {
        ...prev,
        frames: updatedFrames,
        selectedFrameIndex: targetIndex >= 0 ? targetIndex : prev.selectedFrameIndex,
      };
    });

    syncHistoryState();
  }, [syncHistoryState]);

  // Global Keyboard shortcuts (Undo, Redo, Frame Switching)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Frame switching: Ctrl+Left or [
      if (((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') || e.key === '[') {
        e.preventDefault();
        setProject((prev) => ({
          ...prev,
          selectedFrameIndex: Math.max(0, prev.selectedFrameIndex - 1),
        }));
        return;
      }

      // Frame switching: Ctrl+Right or ]
      if (((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') || e.key === ']') {
        e.preventDefault();
        setProject((prev) => ({
          ...prev,
          selectedFrameIndex: Math.min(prev.frames.length - 1, prev.selectedFrameIndex + 1),
        }));
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Handle new uploaded image
  const handleImageLoaded = (dataUrl: string, width: number, height: number, filename: string) => {
    // Default sensible rows/cols based on common aspect ratios
    let initialCols = 4;
    let initialRows = 2;

    if (width === height) {
      initialCols = 2;
      initialRows = 2;
    } else if (width / height >= 4) {
      initialCols = 4;
      initialRows = 1;
    }

    const sliced = sliceSpriteSheet(width, height, initialCols, initialRows);
    historyRef.current.clear();
    syncHistoryState();

    setProject({
      filename,
      sourceImage: dataUrl,
      sourceWidth: width,
      sourceHeight: height,
      columns: initialCols,
      rows: initialRows,
      frameWidth: sliced.frameWidth,
      frameHeight: sliced.frameHeight,
      frames: sliced.frames,
      selectedFrameIndex: 0,
      editorSettings: {
        previousFrameOpacity: 0.5,
        currentFrameOpacity: 1.0,
        showPreviousFrame: true,
        showGrid: false,
        showGuides: true,
        gridSize: 32,
        zoom: 1,
        panX: 0,
        panY: 0,
      },
      previewSettings: {
        fps: 8,
        loop: true,
        playing: false,
      },
    });

    // Automatically prompt slicing configuration so user can adjust rows & columns
    setIsSliceOpen(true);
  };

  // Load demo sprite sheet
  const handleLoadDemo = () => {
    const demo = generateDemoSpriteSheet();
    handleImageLoaded(demo.dataUrl, demo.width, demo.height, demo.name);
  };

  // Apply new rows and columns slicing (Equal or Manual flexible cut lines)
  const handleApplySlicing = (config: SlicingConfig) => {
    try {
      // Keep existing offsets for overlapping frames if user already adjusted them
      const existingOffsets = new Map<number, { x: number; y: number }>();
      project.frames.forEach((f) => {
        existingOffsets.set(f.id, { x: f.offsetX, y: f.offsetY });
      });

      let slicedFrames: FrameData[];
      let targetFw: number;
      let targetFh: number;

      const cutPositions = config.rowXCutPositions || config.xCutPositions;

      if (config.mode === 'manual' && cutPositions && config.yCutPositions) {
        const sliced = sliceSpriteSheetManual(
          project.sourceWidth,
          project.sourceHeight,
          config.columns,
          config.rows,
          cutPositions,
          config.yCutPositions,
          config.canvasSizeMode || 'uniform',
          existingOffsets
        );
        slicedFrames = sliced.frames;
        targetFw = sliced.frameWidth;
        targetFh = sliced.frameHeight;
      } else {
        const sliced = sliceSpriteSheet(
          project.sourceWidth,
          project.sourceHeight,
          config.columns,
          config.rows,
          existingOffsets
        );
        slicedFrames = sliced.frames;
        targetFw = sliced.frameWidth;
        targetFh = sliced.frameHeight;
      }

      historyRef.current.clear();
      syncHistoryState();

      setProject((prev) => ({
        ...prev,
        columns: config.columns,
        rows: config.rows,
        frameWidth: targetFw,
        frameHeight: targetFh,
        slicingMode: config.mode,
        xCutPositions: config.xCutPositions,
        rowXCutPositions: config.rowXCutPositions,
        yCutPositions: config.yCutPositions,
        canvasSizeMode: config.canvasSizeMode,
        frames: slicedFrames,
        selectedFrameIndex: 0,
      }));
    } catch (err: any) {
      setGlobalError(err?.message || 'Failed to slice sprite sheet.');
    }
  };

  // Fit canvas to viewport center
  const handleFitToCanvas = () => {
    // Standard comfortable zoom calculation
    setProject((prev) => ({
      ...prev,
      editorSettings: {
        ...prev.editorSettings,
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    }));
  };

  // Save project as JSON
  const handleSaveProject = () => {
    const projectData: ProjectFileFormat = {
      version: '1.0',
      projectName: 'SpriteAlignmentProject',
      filename: project.filename,
      sourceImageDataUrl: project.sourceImage,
      sourceWidth: project.sourceWidth,
      sourceHeight: project.sourceHeight,
      columns: project.columns,
      rows: project.rows,
      frameWidth: project.frameWidth,
      frameHeight: project.frameHeight,
      slicingMode: project.slicingMode,
      xCutPositions: project.xCutPositions,
      rowXCutPositions: project.rowXCutPositions,
      yCutPositions: project.yCutPositions,
      canvasSizeMode: project.canvasSizeMode,
      frames: project.frames.map((f) => ({
        id: f.id,
        sourceX: f.sourceX,
        sourceY: f.sourceY,
        width: f.width,
        height: f.height,
        canvasWidth: f.canvasWidth,
        canvasHeight: f.canvasHeight,
        offsetX: f.offsetX,
        offsetY: f.offsetY,
      })),
      editorSettings: project.editorSettings,
      previewSettings: project.previewSettings,
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const cleanName = project.filename.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${cleanName}_alignment_project.json`);
  };

  // Load project from JSON
  const handleLoadProject = async (file: File) => {
    setGlobalError(null);
    try {
      const text = await file.text();
      const data: ProjectFileFormat = JSON.parse(text);

      if (!data.sourceImageDataUrl || !data.columns || !data.rows || !Array.isArray(data.frames)) {
        throw new Error('Invalid project file format. Missing required sprite sheets or frame data.');
      }

      // Verify source image loads
      await loadImage(data.sourceImageDataUrl);

      historyRef.current.clear();
      syncHistoryState();

      setProject({
        filename: data.filename || file.name,
        sourceImage: data.sourceImageDataUrl,
        sourceWidth: data.sourceWidth,
        sourceHeight: data.sourceHeight,
        columns: data.columns,
        rows: data.rows,
        frameWidth: data.frameWidth,
        frameHeight: data.frameHeight,
        slicingMode: data.slicingMode,
        xCutPositions: data.xCutPositions,
        rowXCutPositions: data.rowXCutPositions,
        yCutPositions: data.yCutPositions,
        canvasSizeMode: data.canvasSizeMode,
        frames: data.frames,
        selectedFrameIndex: 0,
        editorSettings: {
          ...data.editorSettings,
          panX: 0,
          panY: 0,
        },
        previewSettings: data.previewSettings || {
          fps: 8,
          loop: true,
          playing: false,
        },
      });
    } catch (err: any) {
      setGlobalError(err?.message || 'Failed to load project file.');
    }
  };

  const currentFrame = project.frames[project.selectedFrameIndex] || project.frames[0];
  const previousFrame =
    project.selectedFrameIndex > 0 ? project.frames[project.selectedFrameIndex - 1] : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Top Navigation & Action Header */}
      <Header
        hasImage={Boolean(project.sourceImage)}
        filename={project.filename}
        sourceWidth={project.sourceWidth}
        sourceHeight={project.sourceHeight}
        columns={project.columns}
        rows={project.rows}
        frameWidth={project.frameWidth}
        frameHeight={project.frameHeight}
        totalFrames={project.frames.length}
        canUndo={canUndo}
        canRedo={canRedo}
        isCanvasMaximized={isCanvasMaximized}
        onToggleCanvasMaximize={() => setIsCanvasMaximized((prev) => !prev)}
        onUploadClick={() => setIsUploadOpen(true)}
        onLoadDemo={handleLoadDemo}
        onOpenSlicing={() => setIsSliceOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onOpenExport={() => setIsExportOpen(true)}
        onToggleHelp={() => setIsHelpOpen(true)}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-red-950/80 border-b border-red-800 text-red-200 px-4 py-2 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-red-300 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace: Left Frames, Center Canvas, Right Controls */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {project.frames.length > 0 ? (
          <>
            {/* LEFT: Frame List */}
            <FrameList
              frames={project.frames}
              selectedFrameIndex={project.selectedFrameIndex}
              sourceImage={cachedSourceImage}
              onSelectFrame={(index) =>
                setProject((prev) => ({ ...prev, selectedFrameIndex: index }))
              }
              onResetFrame={handleResetCurrentFrame}
            />

            {/* CENTER: Fixed Dimensions Main Frame Editor Canvas */}
            <EditorCanvas
              currentFrame={currentFrame}
              previousFrame={previousFrame}
              sourceImage={cachedSourceImage}
              settings={project.editorSettings}
              onUpdateOffset={handleUpdateOffset}
              onUpdateSettings={(updater) =>
                setProject((prev) => ({
                  ...prev,
                  editorSettings: updater(prev.editorSettings),
                }))
              }
              onFitToCanvas={handleFitToCanvas}
              isMaximized={isCanvasMaximized}
              onToggleMaximize={() => setIsCanvasMaximized((prev) => !prev)}
              totalFrames={project.frames.length}
              currentFrameIndex={project.selectedFrameIndex}
              onSelectFrame={(index) =>
                setProject((prev) => ({ ...prev, selectedFrameIndex: index }))
              }
              onResetOffset={() => handleResetCurrentFrame()}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />

            {/* RIGHT: Controls (Offsets, Onion skin, temporary opacity, guides, numeric inputs) */}
            <ControlPanel
              currentFrame={currentFrame}
              previousFrame={previousFrame}
              totalFrames={project.frames.length}
              selectedFrameIndex={project.selectedFrameIndex}
              columns={project.columns}
              rows={project.rows}
              sourceWidth={project.sourceWidth}
              sourceHeight={project.sourceHeight}
              settings={project.editorSettings}
              onSelectFrame={(index) =>
                setProject((prev) => ({ ...prev, selectedFrameIndex: index }))
              }
              onUpdateOffset={handleUpdateOffset}
              onResetPosition={() => handleResetCurrentFrame()}
              onUpdateSettings={(updater) =>
                setProject((prev) => ({
                  ...prev,
                  editorSettings: updater(prev.editorSettings),
                }))
              }
              onFitToCanvas={handleFitToCanvas}
            />
          </>
        ) : (
          /* Empty / Upload Prompt Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-950">
            <div className="max-w-md w-full p-8 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center mx-auto text-indigo-400">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-100">
                  No Sprite Sheet Loaded
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Upload your sprite sheet to mathematically slice frames and begin manual onion skin alignment.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
                >
                  Upload Sprite Sheet Image
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Load Sample Sprite Sheet (2048×1024, 4×2)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM: Animation Preview Player & Scrub Timeline */}
      {project.frames.length > 0 && (
        <AnimationPreview
          frames={project.frames}
          sourceImage={cachedSourceImage}
          settings={project.previewSettings}
          selectedFrameIndex={project.selectedFrameIndex}
          onSelectFrame={(index) =>
            setProject((prev) => ({ ...prev, selectedFrameIndex: index }))
          }
          onUpdateSettings={(updater) =>
            setProject((prev) => ({
              ...prev,
              previewSettings: updater(prev.previewSettings),
            }))
          }
        />
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImageLoaded={handleImageLoaded}
        onLoadDemo={handleLoadDemo}
      />

      <SliceModal
        isOpen={isSliceOpen}
        onClose={() => setIsSliceOpen(false)}
        sourceImage={project.sourceImage}
        sourceWidth={project.sourceWidth}
        sourceHeight={project.sourceHeight}
        filename={project.filename}
        initialColumns={project.columns}
        initialRows={project.rows}
        initialMode={project.slicingMode || 'equal'}
        initialXCutPositions={project.xCutPositions}
        initialRowXCutPositions={project.rowXCutPositions}
        initialYCutPositions={project.yCutPositions}
        initialCanvasSizeMode={project.canvasSizeMode || 'uniform'}
        onApplySlicing={handleApplySlicing}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sourceImage={cachedSourceImage}
        sourceImageDataUrl={project.sourceImage}
        frames={project.frames}
        columns={project.columns}
        rows={project.rows}
        frameWidth={project.frameWidth}
        frameHeight={project.frameHeight}
        defaultFilename={project.filename}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      <Analytics />
    </div>
  );
}
