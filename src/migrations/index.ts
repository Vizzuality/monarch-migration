import { monarch } from './monarch';
import type { Migration, Simulation } from './types';
import { wildebeest } from './wildebeest';

export const MIGRATIONS: Migration[] = [monarch, wildebeest];

const simulations = new Map<string, Simulation>();

/** Built on first use and kept, so switching back is instant. */
export function simulationOf(migration: Migration): Simulation {
  let sim = simulations.get(migration.id);
  if (!sim) {
    sim = migration.build();
    simulations.set(migration.id, sim);
  }
  return sim;
}

export function migrationById(id: string | null): Migration {
  return MIGRATIONS.find((m) => m.id === id) ?? MIGRATIONS[0];
}
