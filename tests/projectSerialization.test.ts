import { describe, it, expect } from 'vitest';
import { ProjectManager } from '../src/project/ProjectManager';
import { ProjectSchema } from '../src/project/ProjectSchema';

describe('Project Serialization & Validation (.rcproj format)', () => {
  it('creates and serializes a valid project', () => {
    const proj = ProjectManager.createNewProject('Documentary Project');
    const json = ProjectSchema.serialize(proj);

    expect(typeof json).toBe('string');
    expect(json).toContain('Documentary Project');
    expect(json).toContain('1.0.0');

    const { project: loadedProj, validation } = ProjectSchema.deserialize(json);
    expect(validation.valid).toBe(true);
    expect(loadedProj).not.toBeNull();
    expect(loadedProj?.settings.name).toBe('Documentary Project');
  });

  it('rejects invalid or corrupted project JSON', () => {
    const invalidJson = '{"foo": "bar"}';
    const { project, validation } = ProjectSchema.deserialize(invalidJson);

    expect(project).toBeNull();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('detects missing media assets correctly', () => {
    const proj = ProjectManager.createNewProject('Relink Test');
    proj.assets['asset_missing'] = {
      id: 'asset_missing',
      name: 'Missing.mp4',
      filePath: '',
      type: 'video',
      durationFrames: 100,
      fps: 30,
      width: 1920,
      height: 1080,
      createdAt: Date.now()
    };

    const missing = ProjectManager.findMissingAssets(proj);
    expect(missing).toContain('asset_missing');
  });
});
