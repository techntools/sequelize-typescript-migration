# Topological Sort in `sortActions.ts`

## Problem

Migration actions have FK dependencies. If table `C` has an FK to `B`, then `B` must be created before `C`, and on rollback `C` must be dropped before `B`. The old length-based comparator only compared `depends.length`, so two actions with the same number of dependencies stayed in `deep-diff` order — which has no FK awareness and often produced a broken down sequence.

## Kahn's algorithm

Kahn's algorithm topologically sorts a DAG:

1. Compute `inDegree[v]` — the number of edges pointing into `v`.
2. Put every node with `inDegree === 0` in a ready queue.
3. Pop a ready node, append it to the output, and for each node `w` it points to, decrement `inDegree[w]`. Any `w` that just hit `0` joins the ready queue.
4. When the queue empties, either every node is in the output (a total order exists) or some nodes are still unresolved (there is a cycle).

Invariant: when a node is emitted, every node it depends on is already emitted.

## Applied to FK ordering

For the README scenario `Cars.carBrandId -> CarBrands.ownerId -> Owners`, the `dropTable` actions carry `depends = [incoming references]` — tables in the previous snapshot that point at the dropped one:

```
Cars       (deps=[])           ← nothing references Cars
CarBrands  (deps=[Cars])       ← Cars references CarBrands
Owners     (deps=[CarBrands])  ← CarBrands references Owners
```

Edges (built from `depends`): `Cars -> CarBrands -> Owners`. The target must come first.

Kahn's trace:

| Step | Ready | Emit | inDegree changes |
|------|-------|------|------------------|
| 0 | `[Cars]` | — | — |
| 1 | `[CarBrands]` | `Cars` | `CarBrands` 1 → 0 |
| 2 | `[Owners]` | `CarBrands` | `Owners` 1 → 0 |
| 3 | `[]` | `Owners` | — |

Final order: `Cars, CarBrands, Owners` — the FK-safe rollback sequence.

For `createTable`, `addColumn`, and `changeColumn`, the convention flips: `depends` lists outgoing FK references, so parents must be created before children. Edge direction is always `target -> a` ("target before `a`"), regardless of which side of the FK `depends` enumerates.

## How edges are built

Edges are bucket-local: `target = bucket.find((b) => b.tableName === depName)`. Cross-bucket deps are intentionally ignored — the fixed bucket order (`removeIndex -> removeColumn -> dropTable -> createTable -> addColumn -> changeColumn -> addIndex`) already encodes up/down semantics.

Two details about how `depends` is consumed:

- **Self-deps are skipped.** When `depName` resolves to `a` itself (e.g. `addColumn A.x` with `depends: [A]` resolves to its own entry), `target === a` and the loop continues. The self-dep isn't a real ordering constraint.
- **Duplicate deps count once.** A table with two FK columns pointing at the same model pushes that model twice into `depends`. Both lookups resolve to the same `target`, but only one edge and one unit of in-degree should result. A per-action `Set<IAction>` of seen targets guards both, so duplicates can't strand an action in the cycle fallback.

## Why it is better than the old code

The old `Array.sort` comparator only inspected `depends.length`. Tied actions stayed in `deep-diff` order, which has no FK topology. The new sort inspects the actual `depends` contents and builds edges from them, so the output respects FK relationships regardless of how the diff walker iterates.

Ties on in-degree within a bucket break by original index. That keeps the output deterministic for unrelated actions while still letting Kahn reorder dependent ones.

## Cycle handling

When two actions mutually depend on each other (`A.depends = [B]`, `B.depends = [A]`), neither ever enters the ready queue. The fallback in `topoSortBucket`:

```typescript
if (sorted.length !== bucket.length) {
  for (const a of bucket) {
    if (!sorted.includes(a)) sorted.push(a);
  }
}
```

appends anything unresolved in original input order. The migration file is still produced, with the unresolved actions tacked on after the valid prefix.

The fallback was chosen over throwing because the old comparator also couldn't handle cycles — it returned `0` for tied lengths and let `Array.sort` decide. Throwing would be a stricter behaviour change that could break users with circular FKs (legal in MySQL with deferred constraints, or simply tolerated because the snapshot round-trip loses cyclic structure). The "produce a list" contract is preserved, and the actions summary at the top of the generated migration surfaces the order so users with circular FKs can inspect and hand-edit.

The `sorted.length !== bucket.length` check only signals a real cycle when in-degrees are correct. The duplicate-deps guard above makes that true: without it, the fallback would also (silently) fire on acyclic graphs whose in-degrees were inflated by duplicate FK columns.

## Detailed topological sort traces

The following examples show the bucket-local edge construction, ready queue, and cycle fallback step by step:

```text

Trace of [
  { actionType: 'dropTable', tableName: 'Owners',    depends: ['CarBrands'] },
  { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] },
  { actionType: 'dropTable', tableName: 'Cars',      depends: [] },
]:

  Iterate over action buckets:

    Iter 1
      action = { actionType: 'dropTable', tableName: 'Owners', depends: ['CarBrands'] }
        depName = CarBrands
        target = { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] }
        outgoing of target += action
        inDegree of action is 1

    Iter 2
      action = { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] }
        depName = Cars
        target = { actionType: 'dropTable', tableName: 'Cars', depends: [] }
        outgoing of target += action
        inDegree of action is 1

    Iter 3
      action = { actionType: 'dropTable', tableName: 'Cars', depends: [] },
        * depends is empty

  ready = [{ actionType: 'dropTable', tableName: 'Cars', depends: [] }]

  Iterate over ready

    Iter 1
      next = { actionType: 'dropTable', tableName: 'Cars', depends: [] }
      sorted += next
      neighbors = [{ actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] }]

        inDegree = 0
        ready = [{ CarBrands }]

    sorted = [{ actionType: 'dropTable', tableName: 'Cars', depends: [] }]

    Iter 2
      next = { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] }
      sorted += next
      neighbors = [{ actionType: 'dropTable', tableName: 'Owners', depends: ['CarBrands'] }]

        inDegree = 0
        ready = [{ Owners }]

    sorted = [{ actionType: 'dropTable', tableName: 'Cars', depends: [] }, { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] }]

    Iter 3
      next = { actionType: 'dropTable', tableName: 'Owners', depends: ['CarBrands'] }
      sorted += next
      neighbors = []

    sorted = [{ actionType: 'dropTable', tableName: 'Cars', depends: [] }, { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] }, { actionType: 'dropTable', tableName: 'Owners', depends: ['CarBrands'] }]


Trace of [
  { actionType: 'changeColumn', tableName: 'A', depends: ['B'] },
  { actionType: 'changeColumn', tableName: 'B', depends: ['A'] },
  { actionType: 'changeColumn', tableName: 'C', depends: [] },
]:

  Iterate over action buckets:

    Iter 1
      action = { actionType: 'changeColumn', tableName: 'A', depends: ['B'] }
        depName = B
        target = { actionType: 'changeColumn', tableName: 'B', depends: ['A'] }
        outgoing of target += action
        inDegree of action is 1

    Iter 2
      action = { actionType: 'changeColumn', tableName: 'B', depends: ['A'] }
        depName = A
        target = { actionType: 'changeColumn', tableName: 'A', depends: ['B'] }
        outgoing of target += action
        inDegree of action is 1

    Iter 3
      action = { actionType: 'changeColumn', tableName: 'C', depends: [] },
        * depends is empty

  ready = [{ actionType: 'changeColumn', tableName: 'C', depends: [] }]

  Iterate over ready

    Iter 1
      next = { actionType: 'changeColumn', tableName: 'C', depends: [] }
      sorted += next
      neighbors = []

    sorted = [{ actionType: 'changeColumn', tableName: 'C', depends: [] }]

  sorted.length != bucket.length

    Iter 1
      a = { actionType: 'changeColumn', tableName: 'A', depends: ['B'] }
      sorted += a

    Iter 2
      a = { actionType: 'changeColumn', tableName: 'B', depends: ['A'] }
      sorted += a

    Iter 3
      a = { actionType: 'changeColumn', tableName: 'C', depends: [] }


Trace of [
  { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] },
  { actionType: 'changeColumn', tableName: 'B', depends: ['C'] },
  { actionType: 'changeColumn', tableName: 'C', depends: [] },
]:

  Iterate over action buckets:

    Iter 1
      action = { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }

        depName = B
        target = { actionType: 'changeColumn', tableName: 'B', depends: ['C'] }
        outgoing of target += action
        inDegree of action is 1

        depName = C
        target = { actionType: 'changeColumn', tableName: 'C', depends: [] }
        outgoing of target += action
        inDegree of action is 2

    Iter 2
      action = { actionType: 'changeColumn', tableName: 'B', depends: ['C'] }

        depName = C
        target = { actionType: 'changeColumn', tableName: 'C', depends: [] }
        outgoing of target += action
        inDegree of action is 1

    Iter 3
      action = { actionType: 'changeColumn', tableName: 'C', depends: [] }
        * depends is empty

  ready = [{ actionType: 'changeColumn', tableName: 'C', depends: [] }]

  Iterate over ready

    Iter 1
      next = { actionType: 'changeColumn', tableName: 'C', depends: [] }
      sorted += next
      neighbors = [{ actionType: 'changeColumn', tableName: 'B', depends: ['C'] }, { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }]

        n = { actionType: 'changeColumn', tableName: 'B', depends: ['C'] }
        inDegree = 0
        ready = [{ actionType: 'changeColumn', tableName: 'B', depends: ['C'] }]

        n = { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }
        inDegree = 1

    sorted = [{ actionType: 'changeColumn', tableName: 'C', depends: [] }]

    Iter 2
      next = { actionType: 'changeColumn', tableName: 'B', depends: ['C'] }
      sorted += next
      neighbors = [{ actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }]

        n = { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }
        inDegree = 0
        ready = [{ actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }]

    sorted = [{ actionType: 'changeColumn', tableName: 'C', depends: [] }, { actionType: 'changeColumn', tableName: 'B', depends: ['C'] }]

    Iter 3
      next = { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }
      sorted += next
      neighbors = []

    sorted = [{ actionType: 'changeColumn', tableName: 'C', depends: [] }, { actionType: 'changeColumn', tableName: 'B', depends: ['C'] }, { actionType: 'changeColumn', tableName: 'A', depends: ['B', 'C'] }]

```

## Caveats

- The fallback uses `Array.includes(a)` per iteration -- O(n²) overall. Fine for typical bucket sizes (a handful of tables per type), worth revisiting if buckets ever grow.
- No `console.warn` on cycle detection. The old code didn't warn either. A follow-up could add one so users know their model graph has a cycle the sort couldn't resolve.
- The action-type buckets themselves aren't topologically sorted; they stay in the fixed order `removeIndex -> removeColumn -> dropTable -> createTable -> addColumn -> changeColumn -> addIndex`. Cross-bucket deps are ignored on purpose -- the bucket order already encodes up/down semantics.
