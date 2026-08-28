import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from '../src/modules';

describe('module compiler', () => {
  const registry = createModuleRegistry();

  it('applies modifiers to the projectile on their right', () => {
    const program = registry.compile(['frost', 'pulse']);

    expect(program.warnings).toEqual([]);
    expect(program.energyCost).toBe(20);
    expect(program.shots).toHaveLength(1);
    expect(program.shots[0]).toMatchObject({
      source: 'pulse',
      damage: 18,
      slow: 0.3,
      slowDuration: 1.6,
    });
  });

  it('wraps once to resolve a trailing modifier', () => {
    const program = registry.compile(['pulse', 'overdrive']);

    expect(program.warnings).toEqual([]);
    expect(program.wraps).toBe(1);
    expect(program.shots).toHaveLength(2);
    expect(program.shots[0]).toMatchObject({ source: 'pulse', damage: 18 });
    expect(program.shots[1]).toMatchObject({ source: 'pulse', damage: 27 });
  });

  it('builds nested trigger payloads and charges their energy', () => {
    const program = registry.compile(['impact-trigger', 'pulse', 'nova']);

    expect(program.warnings).toEqual([]);
    expect(program.energyCost).toBe(51);
    expect(program.shots).toHaveLength(1);
    expect(program.shots[0].trigger).toEqual({ type: 'impact', payloadCount: 1 });
    expect(program.shots[0].payload.map((shot) => shot.source)).toEqual(['nova']);
  });

  it('rejects a top-level static projectile', () => {
    const program = registry.compile(['proximity-mine']);

    expect(program.shots).toEqual([]);
    expect(program.warnings).toContain('静态投射物“感应雷”必须作为触发载荷，不能直接施放');
  });

  it('terminates unresolved trigger programs with a diagnostic', () => {
    const program = registry.compile(['impact-trigger', 'pulse']);

    expect(program.wraps).toBe(1);
    expect(program.warnings.some((warning) => warning.includes('缺少 1 个载荷'))).toBe(true);
  });

  it('diagnoses conflicting triggers and keeps only the trigger nearest the projectile', () => {
    const program = registry.compile(['impact-trigger', 'timer-trigger', 'pulse', 'nova']);

    expect(program.diagnostics.map((diagnostic) => diagnostic.code)).toContain('trigger-conflict');
    expect(program.energyCost).toBe(52);
    expect(program.shots[0].trigger).toEqual({ type: 'timer', payloadCount: 1, delay: 0.55 });
    expect(program.shots[0].modules).toEqual(['timer-trigger', 'pulse']);
  });

  it('counts payload instances for every repeated carrier', () => {
    const program = registry.compile(['fork', 'impact-trigger', 'pulse', 'pulse']);

    expect(program.summary).toContain('6 弹体');
  });

  it('caches immutable programs by loadout', () => {
    const first = registry.compile(['frost', 'pulse']);
    const second = registry.compile(['frost', 'pulse']);

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.shots[0])).toBe(true);
  });
});
