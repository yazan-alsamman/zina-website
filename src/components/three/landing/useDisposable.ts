import { type DependencyList, useEffect, useMemo } from "react";

type Disposable = { dispose: () => void };

/**
 * Memoised three.js resource (geometry, material, texture) that is disposed when its inputs
 * change or the component unmounts. R3F only auto-disposes objects it constructs from JSX.
 */
export function useDisposable<T extends Disposable>(factory: () => T, deps: DependencyList): T {
  // The caller owns the dependency list (same contract as useMemo itself).
  // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  const resource = useMemo(factory, deps);
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}
