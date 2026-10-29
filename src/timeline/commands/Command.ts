/**
 * Command pattern architecture for deterministic Undo/Redo timeline editing operations.
 */

import { Sequence, ClipItem } from '../TimelineModel';

export interface Command {
  name: string;
  execute(sequence: Sequence): Sequence;
  undo(sequence: Sequence): Sequence;
}

export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  public executeCommand(command: Command, currentSequence: Sequence): Sequence {
    const newSequence = command.execute(currentSequence);
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
    return newSequence;
  }

  public undo(currentSequence: Sequence): Sequence | null {
    const command = this.undoStack.pop();
    if (!command) return null;
    const restoredSequence = command.undo(currentSequence);
    this.redoStack.push(command);
    return restoredSequence;
  }

  public redo(currentSequence: Sequence): Sequence | null {
    const command = this.redoStack.pop();
    if (!command) return null;
    const restoredSequence = command.execute(currentSequence);
    this.undoStack.push(command);
    return restoredSequence;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

