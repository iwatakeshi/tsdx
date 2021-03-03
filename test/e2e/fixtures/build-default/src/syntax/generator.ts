// regression test for generators
export function* testGenerator(): Generator<boolean, boolean, boolean> {
  return yield true;
}
