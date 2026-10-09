import React from 'react';
import { HelpCircle, X, Keyboard, MousePointer, Layers, CheckCircle2, Maximize2, Move } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Studio Workflow & Shortcuts Guide
              </h2>
              <p className="text-xs text-neutral-400">
                Manual frame registration, onion skin alignment & theater verification
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
          {/* Core Workflow */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recommended Workflow</span>
            </h3>
            <ol className="space-y-1.5 text-neutral-300 list-decimal list-inside bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <li><strong>Upload or Load Sample:</strong> Choose your sprite sheet image.</li>
              <li><strong>Slice Image:</strong> Specify exact columns and rows to mathematically divide frames.</li>
              <li><strong>Frame 1 (Anchor):</strong> Position Frame 1. It serves as your reference base.</li>
              <li><strong>Frame 2:</strong> Frame 1 appears as an onion skin behind Frame 2. Drag Frame 2 until the character matches Frame 1's position.</li>
              <li><strong>Frame 3 to N:</strong> Each subsequent frame compares against the immediately preceding frame.</li>
              <li><strong>Maximize & Verify:</strong> Use the Big Canvas Animation Theater and Maximized Placement Canvas to test stability without jitter.</li>
              <li><strong>Export:</strong> Download individual aligned PNGs or a rebuilt clean sprite sheet.</li>
            </ol>
          </div>

          {/* Maximize & Draggable Controls Feature Highlights */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Screen & Draggable Controls</span>
            </h3>
            <div className="space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-neutral-300">
              <div className="flex items-start gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Maximize Placement Canvas (F / Esc):</strong> Expands the main editor to 100% full-screen workspace with quick HUD controls.</span>
              </div>
              <div className="flex items-start gap-2">
                <Move className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Draggable Zoom Bar:</strong> Click & drag the grip handle on the zoom bar to move it anywhere. Double-click handle to reset to bottom center.</span>
              </div>
              <div className="flex items-start gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Animation Theater (Maximize):</strong> Expand playback to large screen with ground baseline and crosshair stability verification.</span>
              </div>
            </div>
          </div>

          {/* Mouse Controls */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mouse Controls</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <div>
                <strong className="text-neutral-200 block">Left Click Drag:</strong>
                <span className="text-neutral-400 text-[11px]">Moves artwork inside the fixed frame</span>
              </div>
              <div>
                <strong className="text-neutral-200 block">Space + Left Drag:</strong>
                <span className="text-neutral-400 text-[11px]">Pans the viewport around</span>
              </div>
              <div>
                <strong className="text-neutral-200 block">Middle Click Drag:</strong>
                <span className="text-neutral-400 text-[11px]">Pans the viewport canvas</span>
              </div>
              <div>
                <strong className="text-neutral-200 block">Mouse Wheel:</strong>
                <span className="text-neutral-400 text-[11px]">Zooms in and out</span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Keyboard Shortcuts</span>
            </h3>
            <div className="space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-400">Arrow Keys</span>
                <span className="text-amber-400">Nudge artwork by 1 px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Shift + Arrow Keys</span>
                <span className="text-amber-400">Nudge artwork by 10 px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">F</span>
                <span className="text-sky-300">Toggle Full-Screen Placement Canvas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Esc</span>
                <span className="text-amber-300">Exit Maximized / Theater Mode</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">[ and ]</span>
                <span className="text-indigo-300">Previous / Next Frame</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Ctrl + Z / Cmd + Z</span>
                <span className="text-indigo-300">Undo offset change</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Ctrl + Y / Cmd + Shift + Z</span>
                <span className="text-indigo-300">Redo offset change</span>
              </div>
            </div>
          </div>

          {/* Philosophy reminder */}
          <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900 text-[11px] text-indigo-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
            <div>
              <strong>100% Manual Precision:</strong> No automatic cropping, no bounding boxes, no AI alterations. You retain total mathematical control over frame placement.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-neutral-800 bg-neutral-900/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
