/**
 * Project management, file I/O abstraction, and auto-recovery for ReaCut Studio.
 */

import { ProjectData, createDefaultSequence } from '../timeline/TimelineModel';
import { ProjectSchema, CURRENT_SCHEMA_VERSION } from './ProjectSchema';

const AUTOSAVE_STORAGE_KEY = 'reacut_autosave_project';
const AUTOSAVE_TIMESTAMP_KEY = 'reacut_autosave_timestamp';

export class ProjectManager {
  /**
   * Initializes a new empty project.
   */
  public static createNewProject(name: string = 'Untitled Project'): ProjectData {
    const defaultSeq = createDefaultSequence('Sequence 01', 30);
    const now = new Date().toISOString();

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: {
        name,
        version: '1.0.0',
        createdDate: now,
        modifiedDate: now
      },
      assets: {},
      sequences: {
        [defaultSeq.id]: defaultSeq
      },
      activeSequenceId: defaultSeq.id
    };
  }

  /**
   * Saves the current project state to browser/local recovery storage.
   */
  public static saveAutosave(project: ProjectData): void {
    try {
      const json = ProjectSchema.serialize(project);
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, json);
      localStorage.setItem(AUTOSAVE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn('Failed to save autosave recovery snapshot', e);
    }
  }

  /**
   * Retrieves the last autosaved project if available.
   */
  public static loadAutosave(): { project: ProjectData; timestamp: number } | null {
    try {
      const json = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      const timeStr = localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY);
      if (!json || !timeStr) return null;

      const { project, validation } = ProjectSchema.deserialize(json);
      if (project && validation.valid) {
        return { project, timestamp: parseInt(timeStr, 10) };
      }
    } catch (e) {
      console.warn('Failed to load autosave snapshot', e);
    }
    return null;
  }

  /**
   * Clears autosave storage.
   */
  public static clearAutosave(): void {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    localStorage.removeItem(AUTOSAVE_TIMESTAMP_KEY);
  }

  /**
   * Detects assets whose media cannot be loaded or found.
   */
  public static findMissingAssets(project: ProjectData): string[] {
    const missingIds: string[] = [];
    for (const [id, asset] of Object.entries(project.assets)) {
      if (asset.type === 'title') continue;
      if (!asset.filePath && !asset.thumbnailUrl) {
        missingIds.push(id);
      }
    }
    return missingIds;
  }
}
