import type { IAction } from "./getDiffActionsFromTables";

/*
 * Buckets run in this fixed order. The order already matches up/down
 * semantics (drops before creates on rollback, indexes after columns), so we
 * don't consult `depends` to reorder buckets. Inside a bucket, `depends`
 * drives a stable topological sort.
 */
const orderedActionTypes: string[] = [
  "removeIndex",
  "removeColumn",
  "dropTable",
  "createTable",
  "addColumn",
  "changeColumn",
  "addIndex",
];

const bucketIndex = (a: IAction): number => orderedActionTypes.indexOf(a.actionType);

const topoSortBucket = (bucket: IAction[]): IAction[] => {
  // Kahn's algorithm. Edge u -> v means u must come before v.
  const originalIndex = new Map<IAction, number>();
  bucket.forEach((a, i) => originalIndex.set(a, i));

  const inDegree = new Map<IAction, number>();
  const outgoing = new Map<IAction, IAction[]>();
  bucket.forEach((a) => {
    inDegree.set(a, 0);
    outgoing.set(a, []);
  });

  // `depends` lists table names that must already exist when this action
  // runs. We turn that into intra-bucket edges only (target -> a) when the
  // target is also in this bucket. Duplicates in `depends` (e.g. two FK
  // columns pointing at the same model) must count as one predecessor, so
  // both the edge push and the in-degree bump are guarded by a per-action
  // seen-set.
  const seenDeps = new Set<IAction>();
  for (const a of bucket) {
    seenDeps.clear();
    for (const depName of a.depends) {
      const target = bucket.find((b) => b.tableName === depName);
      if (!target || target === a) continue;
      if (seenDeps.has(target)) continue;
      seenDeps.add(target);
      const list = outgoing.get(target)!;
      if (!list.includes(a)) list.push(a);
      inDegree.set(a, (inDegree.get(a) || 0) + 1);
    }
  }

  // Ties in the ready queue break by original index to keep order stable.
  const ready: IAction[] = bucket
    .filter((a) => (inDegree.get(a) || 0) === 0)
    .sort((x, y) => originalIndex.get(x)! - originalIndex.get(y)!);

  const sorted: IAction[] = [];
  while (ready.length) {
    const next = ready.shift()!;
    sorted.push(next);
    const neighbors = outgoing.get(next) || [];
    for (const n of neighbors) {
      const d = (inDegree.get(n) || 0) - 1;
      inDegree.set(n, d);
      if (d === 0) {
        ready.push(n);
        ready.sort((x, y) => originalIndex.get(x)! - originalIndex.get(y)!);
      }
    }
  }

  // Anything left is part of a cycle. The old length-based comparator also
  // couldn't break cycles; we keep the same "produce a list" contract and
  // append the leftover nodes in input order.
  if (sorted.length !== bucket.length) {
    for (const a of bucket) {
      if (!sorted.includes(a)) sorted.push(a);
    }
  }

  return sorted;
};

export default function sortActions(actions: IAction[]) {
  const buckets: IAction[][] = orderedActionTypes.map(() => []);
  const unknown: IAction[] = [];
  for (const a of actions) {
    const i = bucketIndex(a);
    if (i < 0) {
      unknown.push(a);
    } else {
      buckets[i].push(a);
    }
  }

  return ([] as IAction[]).concat(...buckets.map(topoSortBucket), unknown);
}