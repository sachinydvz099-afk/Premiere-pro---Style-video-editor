/**
 * Project schema validation and versioning for ReaCut Studio (.rcproj format).
 */

import { ProjectData } from '../timeline/TimelineModel';

export const CURRENT_SCHEMA_VERSION = '1.0.0';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProjectSchema {
  /**
   * Validates project object against schema structure and constraints.
   */
  public static validate(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Project data must be a valid JSON object.'], warnings: [] };
    }

    const proj = data as Partial<ProjectData>;

    if (proj.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      warnings.push(`Project schema version '${proj.schemaVersion}' may differ from current '${CURRENT_SCHEMA_VERSION}'. Attempting automatic migration.`);
    }

    if (!proj.settings || typeof proj.settings.name !== 'string') {
      errors.push('Missing or invalid project settings: project name is required.');
    }

    if (!proj.sequences || typeof proj.sequences !== 'object' || Object.keys(proj.sequences).length === 0) {
      errors.push('Project must contain at least one sequence.');
    } else {
      for (const [seqId, seq] of Object.entries(proj.sequences)) {
        if (!seq.tracks || !Array.isArray(seq.tracks)) {
          errors.push(`Sequence '${seqId}' does not contain a valid tracks array.`);
        }
        if (!seq.clips || typeof seq.clips !== 'object') {
          errors.push(`Sequence '${seqId}' does not contain a valid clips dictionary.`);
        }
      }
    }

    if (!proj.assets || typeof proj.assets !== 'object') {
      errors.push('Missing assets registry.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Serializes project data to a formatted JSON string.
   */
  public static serialize(project: ProjectData): string {
    return JSON.stringify(project, null, 2);
  }

  /**
   * Deserializes and validates a JSON string into ProjectData.
   */
  public static deserialize(jsonString: string): { project: ProjectData | null; validation: ValidationResult } {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = this.validate(parsed);
      if (!validation.valid) {
        return { project: null, validation };
      }
      return { project: parsed as ProjectData, validation };
    } catch (err) {
      return {
        project: null,
        validation: {
          valid: false,
          errors: [`Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`],
          warnings: []
        }
      };
    }
  }
}
