import React, { useRef, useEffect } from 'react';
import { FrameData } from '../types';
import { FrameThumbnail } from './FrameThumbnail';
import { Film, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface FrameListProps {
  frames: FrameData[];
  selectedFrameIndex: number;
  sourceImage: HTMLImageElement | null;
  onSelectFrame: (index: number) => void;
  onResetFrame: (index: number) => void;
}

export const FrameList: React.FC<FrameListProps> = ({
  frames,
  selectedFrameIndex,
  sourceImage,
  onSelectFrame,
  onResetFrame,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected frame item into view
  useEffect(() => {
    const activeEl = document.getElementById(`frame-item-${frames[selectedFrameIndex]?.id}`);
    if (activeEl && listRef.current) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFrameIndex, frames]);

  return (
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Frames ({frames.length})
          </h2>
        </div>
        <div className="text-[11px] font-mono text-neutral-400">
          Selected: #{selectedFrameIndex + 1}
        </div>
      </div>

      {/* Frame navigation quick-stepper */}
      <div className="px-3 py-1.5 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-neutral-500">
          Row-Major Order
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelectFrame(Math.max(0, selectedFrameIndex - 1))}
            disabled={selectedFrameIndex === 0}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 rounded transition cursor-pointer"
            title="Previous Frame (Ctrl+Left or [)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectFrame(Math.min(frames.length - 1, selectedFrameIndex + 1))}
            disabled={selectedFrameIndex === frames.length - 1}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 rounded transition cursor-pointer"
            title="Next Frame (Ctrl+Right or ])"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frames Scrollable Container */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {frames.map((frame, index) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            sourceImage={sourceImage}
            isSelected={index === selectedFrameIndex}
            onSelect={() => onSelectFrame(index)}
          />
        ))}
      </div>

      {/* Footer info & Quick Reset */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
        <div className="text-[11px] text-neutral-400">
          Frame {selectedFrameIndex + 1} of {frames.length}
        </div>
        <button
          onClick={() => onResetFrame(selectedFrameIndex)}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-amber-400 transition cursor-pointer"
          title="Reset current frame offset to (0, 0)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Frame</span>
        </button>
      </div>
    </aside>
  );
};
