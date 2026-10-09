export interface OffsetAction {
  frameId: number;
  prevX: number;
  prevY: number;
  nextX: number;
  nextY: number;
  description?: string;
}

export class HistoryTracker {
  private past: OffsetAction[] = [];
  private future: OffsetAction[] = [];
  private maxHistory: number = 50;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  record(action: OffsetAction) {
    // Only record if there is an actual change
    if (action.prevX === action.nextX && action.prevY === action.nextY) {
      return;
    }
    this.past.push(action);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    // Any new action clears redo stack
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): OffsetAction | null {
    const action = this.past.pop();
    if (!action) return null;
    this.future.push(action);
    return action;
  }

  redo(): OffsetAction | null {
    const action = this.future.pop();
    if (!action) return null;
    this.past.push(action);
    return action;
  }

  clear() {
    this.past = [];
    this.future = [];
  }
}
