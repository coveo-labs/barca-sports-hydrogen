# A2UI Frontend Rendering Architecture

This document describes how the frontend receives, processes, and renders
**Agent-to-UI (A2UI)** activity snapshots — the structured surface events that
the backend agent emits to drive rich, progressive UI updates in the generative
chat interface.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Map](#2-file-map)
3. [SSE Stream → Hook → Processor](#3-sse-stream--hook--processor)
4. [A2UIMessageProcessor — skeleton swap & surface tracking](#4-a2uimessageprocessor--skeleton-swap--surface-tracking)
5. [SurfaceManager — operation dispatch](#5-surfacemanager--operation-dispatch)
6. [DataModelStore — wire-format deserialization](#6-datamodelstore--wire-format-deserialization)
7. [DataBindingResolver — prop resolution](#7-databindingresolver--prop-resolution)
8. [SurfaceRenderer — component tree rendering](#8-surfacerenderer--component-tree-rendering)
9. [ComponentRenderer — per-component prop mapping](#9-componentrenderer--per-component-prop-mapping)
10. [Per-component prop tables](#10-per-component-prop-tables)
11. [Three-phase timeline (skeleton → content → next-actions)](#11-three-phase-timeline-skeleton--content--next-actions)
12. [React state persistence (`a2uiSurfaces`)](#12-react-state-persistence-a2uisurfaces)

---

## 1. Overview

```
Backend SSE stream
  │
  ▼  text/event-stream
useAssistantStreaming (use-assistant-streaming.ts)
  │   parses each SSE event via parseAssistantStreamEvent
  │   routes ACTIVITY_SNAPSHOT events to ↓
  ▼
A2UIMessageProcessor (message-processor.ts)
  │   skeleton-swap logic (activitySurfaces Map)
  │   delegates ops to ↓
  ▼
SurfaceManager (surface-manager.ts)
  │   holds Map<surfaceId, SurfaceState>
  │   dispatches each A2UIOperation to:
  │     beginRendering  → sets surface.root / catalogId / isRendered
  │     surfaceUpdate   → upserts ComponentDefinitions
  │     dataModelUpdate → calls surface.dataModel.update(contents)
  │     deleteSurface   → removes surface from Map
  ▼
DataModelStore (data-model-store.ts)
  │   contents[] → typed JS values via dataToValue()
  │   isList detection for anonymous { valueMap: [...] } entries
  │   JSON Pointer get(path)
  ▼
(surfaces serialized into React state as SerializableSurfaceState)
  ▼
SurfaceRenderer (SurfaceRenderer.tsx)
  │   reads SurfaceState, skips bundle-surface-* silently
  │   renders root component + sibling components + NextActionsBar last
  ▼
ComponentRenderer (ComponentRenderer.tsx)
  │   switch on catalogComponentId
  │   calls resolveComponentBindings + resolveTemplateData
  │   maps ec_* fields → React component props
  ▼
React components
  ProductCarousel / ComparisonTable / BundleDisplay / NextActionsBar /
  A2UIProductCard / ComparisonSummary / Text / Image / Button / …
```

---

## 2. File Map

| File                                            | Role                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `app/lib/generative/streaming/types.ts`         | `ActivitySnapshotEvent`, `A2UIOperation` type definitions                                             |
| `app/lib/generative/streaming/index.ts`         | Re-exports for streaming types and utilities                                                          |
| `app/lib/generative/use-assistant-streaming.ts` | SSE stream consumer; routes events; owns `A2UIMessageProcessor`                                       |
| `app/lib/a2ui/message-processor.ts`             | `A2UIMessageProcessor`; skeleton-swap logic; `activitySurfaces` Map                                   |
| `app/lib/a2ui/surface-manager.ts`               | `SurfaceManager`; `SurfaceState`; `SerializableSurfaceState`; `serializeSurface`/`deserializeSurface` |
| `app/lib/a2ui/data-model-store.ts`              | `DataModelStore`; wire-format deserialization; JSON Pointer traversal                                 |
| `app/lib/a2ui/data-binding-resolver.ts`         | `resolveBoundValue`; `resolveComponentBindings`; `resolveTemplateData`                                |
| `app/components/A2UI/SurfaceRenderer.tsx`       | Root render loop; bundle-surface-\* suppression; NextActionsBar last                                  |
| `app/components/A2UI/ComponentRenderer.tsx`     | Switch on `catalogComponentId`; prop resolution per component                                         |
| `app/components/A2UI/ProductCarousel.tsx`       | Horizontal snap-scroll carousel with skeleton shimmer                                                 |
| `app/components/A2UI/ComparisonTable.tsx`       | Side-by-side product table with "Recommended" badge                                                   |
| `app/components/A2UI/BundleDisplay.tsx`         | Tabbed multi-bundle card; pulls product data from slot surfaces                                       |
| `app/components/A2UI/NextActionsBar.tsx`        | Pill buttons for follow-up / search actions                                                           |
| `app/components/A2UI/A2UIProductCard.tsx`       | Single product card with star rating, promo price, Add-to-Cart                                        |
| `app/components/A2UI/ConversationAnswer.tsx`    | Wrapper `<div>` for complete agent replies                                                            |

---

## 3. SSE Stream → Hook → Processor

**File:** `app/lib/generative/use-assistant-streaming.ts`

The hook `useAssistantStreaming` owns the entire streaming lifecycle for one
user turn:

1. Opens a `fetch` POST to the configured `endpoint`.
2. Reads the response body as a `ReadableStream` via
   `processSSEStream(reader, bufferProcessor)`.
3. Each parsed SSE frame is handed to `processEvent(event)`.
4. For `ACTIVITY_SNAPSHOT` events specifically:

```ts
case 'ACTIVITY_SNAPSHOT': {
  a2uiProcessor.processActivitySnapshot(parsedEvent);   // ← A2UI path
  // If no TEXT_MESSAGE_START yet, create a synthetic assistant message
  if (!assistantMessageId) {
    assistantMessageId = generateId();
    // ...push empty assistant message with generated id...
  }
  syncA2UISurfaces();    // serialise all surfaces into React state
  a2uiSurfacesSynced = true;
  return;
}
```

Key invariant: a conversation message (`assistantMessageId`) always exists
before `syncA2UISurfaces()` runs. The hook ensures this in three ways:

- `TEXT_MESSAGE_START` pre-inserts the message with the backend-assigned ID.
- If `ACTIVITY_SNAPSHOT` arrives before `TEXT_MESSAGE_START`, the hook
  creates a synthetic placeholder with a locally-generated ID.
- When `TEXT_MESSAGE_START` later arrives with a different ID, it renames
  the synthetic placeholder in-place to avoid a duplicate bubble.

### `syncA2UISurfaces`

```ts
const syncA2UISurfaces = () => {
  const surfaceManager = a2uiProcessor.getSurfaceManager();
  const surfaceIds = surfaceManager.getAllSurfaceIds();
  const surfaces: Record<string, SerializableSurfaceState> = {};
  for (const surfaceId of surfaceIds) {
    const surface = surfaceManager.getSurface(surfaceId);
    if (surface) surfaces[surfaceId] = serializeSurface(surface);
  }
  // writes surfaces into conversation.messages[assistantMessageIdx].metadata.a2uiSurfaces
  applyUpdate(...);
};
```

This is called after every `ACTIVITY_SNAPSHOT`, causing a React state update
that triggers a re-render with the latest surface set.

---

## 4. A2UIMessageProcessor — skeleton swap & surface tracking

**File:** `app/lib/a2ui/message-processor.ts`

### Constructor

```ts
new A2UIMessageProcessor({
  onSurfaceUpdate: (surfaceId) => syncA2UISurfaces(),
  onSurfaceDelete: (surfaceId) => syncA2UISurfaces(),
  onError:         (error)     => logError(…),
})
```

### `activitySurfaces` Map

```ts
private activitySurfaces = new Map<string, Set<string>>();
//                                   ↑ messageId   ↑ surface IDs introduced by that snapshot
```

Tracks which surfaces each `messageId` introduced, enabling atomic skeleton
replacement when the real content snapshot arrives.

### Skeleton swap — `processActivitySnapshot`

```ts
processActivitySnapshot(event: ActivitySnapshotEvent): void {
  // 1. If replace=true and messageId seen before → delete old surfaces
  if (event.replace && this.activitySurfaces.has(event.messageId)) {
    const previousSurfaces = this.activitySurfaces.get(event.messageId)!;
    for (const surfaceId of previousSurfaces) {
      this.surfaceManager.deleteSurface(surfaceId);
      this.eventHandler.onSurfaceDelete?.(surfaceId);
    }
    this.activitySurfaces.delete(event.messageId);
  }

  // 2. Apply all operations in the new snapshot
  for (const operation of operations) {
    this.processOperation(operation);
  }

  // 3. Record which surfaces this messageId now owns
  const updatedSurfaces = this.extractUpdatedSurfaceIds(operations);
  this.activitySurfaces.set(event.messageId, updatedSurfaces);

  // 4. Notify listeners
  for (const surfaceId of updatedSurfaces) {
    this.eventHandler.onSurfaceUpdate?.(surfaceId);
  }
}
```

The backend emits the skeleton and the real content snapshot with the **same
`messageId`** and both with `replace: true`. When the real snapshot arrives,
step 1 deletes the skeleton surface and step 2 creates the real surface fresh —
the skeleton is replaced atomically.

---

## 5. SurfaceManager — operation dispatch

**File:** `app/lib/a2ui/surface-manager.ts`

### `SurfaceState`

```ts
type SurfaceState = {
  surfaceId: string;
  root: string | null; // root component ID (set by beginRendering)
  catalogId: string | null; // catalogId from beginRendering
  components: Map<string, ComponentDefinition>;
  dataModel: DataModelStore;
  isRendered: boolean; // true once beginRendering processed
};
```

### `ComponentDefinition`

```ts
type ComponentDefinition = {
  id: string;
  catalogComponentId: string; // e.g. "ProductCarousel"
  component: Record<string, unknown>; // raw component props object
  children?: Record<string, unknown>;
};
```

`catalogComponentId` is extracted from the wire format by taking the first key
of the `component` object:

```ts
// Wire: { "id": "root", "component": { "ProductCarousel": { isLoading: true } } }
const keys = Object.keys(component.component);
catalogComponentId = keys[0]; // → "ProductCarousel"
```

### `processOperation` dispatch

| Operation key     | Handler                    | Effect                                                           |
| ----------------- | -------------------------- | ---------------------------------------------------------------- |
| `beginRendering`  | `beginRendering(op)`       | Sets `surface.root`, `catalogId`, `isRendered = true`            |
| `surfaceUpdate`   | `surfaceUpdate(op)`        | Upserts `ComponentDefinition` per component in `op.components[]` |
| `dataModelUpdate` | `dataModelUpdate(op)`      | Calls `surface.dataModel.update(op.contents)`                    |
| `deleteSurface`   | `deleteSurface(surfaceId)` | Removes surface from `surfaces` Map                              |

### Serialisation helpers

`serializeSurface(surface)` converts a live `SurfaceState` (with `Map` and
`DataModelStore` instances) to a plain-object `SerializableSurfaceState` safe
for React state storage:

```ts
{
  surfaceId:     string,
  root:          string | null,
  catalogId:     string | null,
  components:    ComponentDefinition[],   // Array.from(components.values())
  dataModelData: Record<string, unknown>, // dataModel.getAll()
  isRendered:    boolean,
}
```

`deserializeSurface(serialized)` reconstructs the live `SurfaceState`
using `dataModel.setAll(dataModelData)` to bypass re-parsing of already-resolved
JS values.

---

## 6. DataModelStore — wire-format deserialization

**File:** `app/lib/a2ui/data-model-store.ts`

### Wire format — `contents` array

`dataModelUpdate.contents` is an array of `DataModelEntry`:

```ts
type DataModelEntry = {
  key?: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueMap?: Array<DataModelEntry>;
};
```

Scalar values use `valueString` / `valueNumber` / `valueBoolean` (never a
plain `value` key).

### `update(contents)` → `dataToValue`

`dataToValue(entries)` iterates the entries and:

- Skips anonymous entries (`key === undefined`) — they are list items handled
  by the parent entry's `isList` branch.
- Maps scalar variants directly to JS primitives.
- For `valueMap`, detects whether it encodes a **list** or a **nested object**:

```ts
const firstEntry = entry.valueMap[0];
const isList =
  firstEntry !== undefined &&
  firstEntry.key === undefined && // anonymous wrapper
  firstEntry.valueMap !== undefined; // inner entry has its own valueMap

if (isList) {
  // Array of objects — each element is { valueMap: [...keyed entries...] }
  result[key] = entry.valueMap.map((item) => this.dataToValue(item.valueMap!));
} else {
  // Nested object — all entries have keys
  result[key] = this.dataToValue(entry.valueMap);
}
```

**Wire example — list of products:**

```json
{
  "key": "items",
  "valueMap": [
    {
      "valueMap": [
        {"key": "ec_product_id", "valueString": "SKU-001"},
        {"key": "ec_name", "valueString": "Trail Shoes"},
        {"key": "ec_price", "valueNumber": 149.99}
      ]
    }
  ]
}
```

Deserialised result: `{ items: [{ ec_product_id: "SKU-001", ec_name: "Trail Shoes", ec_price: 149.99 }] }`

### `get(path)` — JSON Pointer traversal

```ts
dataModel.get('/items/0/ec_name'); // → "Trail Shoes"
dataModel.get('/items'); // → [{ ec_product_id: "SKU-001", ... }]
```

Path segments use RFC 6901 escaping (`~1` → `/`, `~0` → `~`).  
`get('/')` or `get(undefined)` returns the entire root object.

### `setAll(data)` — deserialisation bypass

Used by `deserializeSurface` to restore already-resolved JS values from
`SerializableSurfaceState.dataModelData` without re-parsing the wire format.

---

## 7. DataBindingResolver — prop resolution

**File:** `app/lib/a2ui/data-binding-resolver.ts`

### `resolveBoundValue(boundValue, dataModel)`

Resolves a single `BoundValue` shape to a JS value:

| Shape                                | Behaviour                                                          |
| ------------------------------------ | ------------------------------------------------------------------ |
| `{ path: "/x" }`                     | Returns `dataModel.get("/x")`                                      |
| `{ path: "/x", literalString: "v" }` | Writes `"v"` into model at key, then returns `dataModel.get("/x")` |
| `{ literalString: "v" }`             | Returns `"v"` directly (no path lookup)                            |
| `{ literalNumber: 42 }`              | Returns `42`                                                       |
| `{ literalBoolean: true }`           | Returns `true`                                                     |
| Anything else                        | Returned as-is (not a BoundValue)                                  |

### `resolveComponentBindings(component, dataModel)`

Recursively walks every key/value in `component`. If a value looks like a
`BoundValue` (has `path`, `literalString`, `literalNumber`, or
`literalBoolean`), it calls `resolveBoundValue`. Otherwise it recurses into
nested objects or maps over arrays.

**Important call convention in `ComponentRenderer`:**

```ts
const resolved = resolveComponentBindings(
  {catalogComponentId, component: componentProps},
  dataModel,
);
// resolved structure: { catalogComponentId: "...", component: { resolvedProp: value, ... } }
// Therefore each case does:
const resolvedProps = (resolved as any).component || resolved;
```

### `resolveTemplateData(path, dataModel)`

Returns `dataModel.get(path)` cast as `unknown[]`, or `[]` if the value is
not an array. Used to populate `products` and `actions` arrays from the data
model.

---

## 8. SurfaceRenderer — component tree rendering

**File:** `app/components/A2UI/SurfaceRenderer.tsx`

### Guard conditions

```ts
if (!surface.isRendered || !surface.root) return null; // awaiting beginRendering
if (surface.surfaceId.startsWith('bundle-surface-')) return null; // slot surface
```

`bundle-surface-*` surfaces are silently suppressed because they exist only as
data containers for `BundleDisplay` to pull product info from — they must not
appear as standalone chat bubbles.

### Layout components (handled inline by SurfaceRenderer)

| `catalogComponentId` | Rendered as                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `Column`             | `<div className="flex flex-col gap-4">` with `childIds` from `componentProps.children.explicitList` |
| `Row`                | `<div className="flex flex-row gap-2 flex-wrap">` with `childIds`                                   |
| `List`               | Iterates `dataModel.get(template.dataBinding)` array, rendering `template.componentId` per item     |
| `Card`               | `<div>` with border/shadow wrapping `componentProps.child`                                          |
| `ConversationAnswer` | `<ConversationAnswer>` wrapping `childIds`                                                          |

### Sibling render loop

After rendering the root, `SurfaceRenderer` walks `surface.components` for any
non-root, non-template components:

- **`NextActionsBar`** components are collected separately and rendered **last**,
  regardless of their declaration order in the surface.
- All other sibling components are rendered in Map iteration order before
  `NextActionsBar`.

```
<div className="flex flex-col gap-4 w-full">
  {rootResult}
  {siblingNodes}    ← ProductCarousel, ComparisonTable, BundleDisplay, …
  {actionsNodes}    ← NextActionsBar (always last)
</div>
```

If there are no siblings and no action nodes, the root result is returned
unwrapped (no extra `<div>`).

---

## 9. ComponentRenderer — per-component prop mapping

**File:** `app/components/A2UI/ComponentRenderer.tsx`

`ComponentRenderer` is responsible for **leaf** components (not layout
containers). It receives a `ComponentDefinition` and a `DataModelStore`, calls
`resolveComponentBindings`, and delegates to the correct React component.

### `isLoading` wiring

The skeleton snapshot sets `isLoading: true` directly in the component props:

```json
{"ProductCarousel": {"isLoading": true}}
```

`ComponentRenderer` reads `componentProps.isLoading` (before binding
resolution) and passes it through to the component. When the real snapshot
arrives it replaces the skeleton entirely (via the skeleton-swap mechanism),
so `isLoading` will never be `true` in the real content snapshot.

### `catalogComponentId` switch cases

| Case                         | Component           | Product data source                                                                                             |
| ---------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ProductCard`                | `A2UIProductCard`   | Resolved props directly (`ec_*` fields)                                                                         |
| `ProductCarousel`            | `ProductCarousel`   | `resolveTemplateData(componentProps.products.dataBinding, dataModel)`                                           |
| `ComparisonTable`            | `ComparisonTable`   | `resolveTemplateData(componentProps.products.dataBinding, dataModel)` with ec\_\* → `ComparisonProduct` mapping |
| `ComparisonSummary`          | `ComparisonSummary` | `resolvedProps.text`                                                                                            |
| `BundleDisplay`              | `BundleDisplay`     | `componentProps.bundles` (inline literal); slot product data from `surfaceMap`                                  |
| `NextActionsBar`             | `NextActionsBar`    | `resolveTemplateData(componentProps.actions.dataBinding, dataModel)`                                            |
| `Text`                       | `<h1/h2/h3/p>`      | `resolved.text` / `resolved.content`; `resolved.usageHint` controls tag                                         |
| `Image`                      | `<img>`             | `resolved.url`, `resolved.alt`, `resolved.usageHint`                                                            |
| `Button`                     | `<button>`          | `resolved.text`, `resolved.variant`, `resolved.action`                                                          |
| `Column`/`Row`/`List`/`Card` | —                   | Handled by `SurfaceRenderer`; `ComponentRenderer` returns `null`                                                |

---

## 10. Per-component prop tables

### `ProductCarousel`

| Prop              | Type                            | Source                                                                 |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `headline`        | `string \| undefined`           | `resolvedProps.heading` or `resolvedProps.headline`                    |
| `products`        | `Array<Record<string,unknown>>` | `resolveTemplateData(products.dataBinding, dataModel)` — `ec_*` fields |
| `isLoading`       | `boolean`                       | `componentProps.isLoading` (skeleton flag)                             |
| `onProductSelect` | `(id: string) => void`          | Passed from `SurfaceRenderer`                                          |

Skeleton: renders `SKELETON_CARD_COUNT` (4) `SkeletonCard` shimmer cards when
`isLoading && products.length === 0`.

### `ComparisonTable`

| Prop              | Type                   | Source                                                                               |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `headline`        | `string \| undefined`  | `resolvedProps.heading` or `resolvedProps.headline`                                  |
| `products`        | `ComparisonProduct[]`  | `resolveTemplateData(products.dataBinding, dataModel)` mapped to `ComparisonProduct` |
| `attributes`      | `string[]`             | `resolvedProps.attributes` — custom attribute keys to display as rows                |
| `isLoading`       | `boolean`              | `componentProps.isLoading`                                                           |
| `onProductSelect` | `(id: string) => void` | Passed through                                                                       |

`ComparisonProduct` mapping (in `ComponentRenderer`):

| `ec_*` field             | `ComparisonProduct` field                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `ec_product_id`          | `productId`                                                              |
| `ec_name`                | `name`                                                                   |
| `ec_image`               | `imageUrl`                                                               |
| `ec_price`               | `price` (or `originalPrice` when on sale)                                |
| `ec_promo_price`         | Becomes `price` when lower than `ec_price`; `originalPrice` = `ec_price` |
| `ec_currency`            | `currency`                                                               |
| `ec_rating`              | `rating`                                                                 |
| `clickUri`                 | `url`                                                                    |
| all remaining `p.*` keys | Spread onto `ComparisonProduct` for `attributes` row lookup              |

Skeleton: renders `ComparisonTableSkeleton` (3 columns × 4 rows shimmer) when
`isLoading && products.length === 0`.

### `BundleDisplay`

| Prop              | Type                        | Source                                                             |
| ----------------- | --------------------------- | ------------------------------------------------------------------ |
| `title`           | `string \| undefined`       | `componentProps.title` (string or `{literalString: "..."}`)        |
| `bundles`         | `Bundle[]`                  | `componentProps.bundles` (inline literal array in component props) |
| `surfaceMap`      | `Map<string, SurfaceState>` | Passed from `ComponentRenderer` via `SurfaceRenderer`              |
| `isLoading`       | `boolean`                   | `componentProps.isLoading`                                         |
| `onProductSelect` | `(id: string) => void`      | Passed through                                                     |

`Bundle` shape (from component props literal):

```ts
{
  bundleId:    string,
  label:       string,
  description: string,
  slots: [{ categoryLabel: string, surfaceRef: string }],
}
```

Each `slot.surfaceRef` names a `bundle-surface-*` surface. `BundleDisplay`
calls `surfaceMap.get(surfaceRef)`, then `surface.dataModel.get('/items')`
to extract the product for that slot. Slots whose surface has not yet loaded
display an inline per-slot shimmer.

Skeleton: `BundleDisplaySkeleton` (2 tabs + 3 slot cards shimmer) when
`isLoading && bundles.length === 0`.

### `NextActionsBar`

| Prop               | Type                            | Source                                                |
| ------------------ | ------------------------------- | ----------------------------------------------------- |
| `actions`          | `Array<Record<string,unknown>>` | `resolveTemplateData(actions.dataBinding, dataModel)` |
| `isLoading`        | `boolean`                       | `componentProps.isLoading`                            |
| `onSearchAction`   | `(query: string) => void`       | Passed from `SurfaceRenderer`                         |
| `onFollowupAction` | `(message: string) => void`     | Passed from `SurfaceRenderer`                         |

Each action in the array is consumed as `{ text: string, type: 'search' | 'followup' }`.
`type="search"` calls `onSearchAction(text)`; `type="followup"` calls
`onFollowupAction(text)`.

Skeleton: two `h-9 w-36 animate-pulse` pill placeholders when `isLoading`.

### `A2UIProductCard`

Rendered directly from `ec_*` fields resolved from the data model or from
component props (for a standalone `ProductCard` surface component).

| Prop            | Type                                        |
| --------------- | ------------------------------------------- |
| `productId`     | `string` — `ec_product_id`                  |
| `name`          | `string` — `ec_name`                        |
| `imageUrl`      | `string` — `ec_image`                       |
| `price`         | `number` — `ec_price`                       |
| `originalPrice` | `number \| undefined` — `ec_promo_price`    |
| `currency`      | `string` — `ec_currency` (default `"USD"`)  |
| `rating`        | `number \| undefined` — `ec_rating`         |
| `url`           | `string` — `clickUri`                         |
| `colors`        | `string[] \| undefined` — `ec_colors`       |
| `selectedColor` | `string \| undefined` — `ec_selected_color` |

---

## 11. Three-phase timeline (skeleton → content → next-actions)

For every rendering tool call the backend emits up to three
`ACTIVITY_SNAPSHOT` events. All three use `replace: true`.

```
TOOL_CALL_START  (render_product_carousel / render_comparison_table / render_bundle_display)
  → Phase 0: ACTIVITY_SNAPSHOT (messageId=A, replace=true)
      operations:
        beginRendering { surfaceId: "skeleton-surface-<slug>", root: "skeleton-root-<slug>" }
        surfaceUpdate  { components: [{ id: "skeleton-root-<slug>",
                                        component: { "ProductCarousel": { isLoading: true } } }] }
      Effect: SurfaceRenderer shows shimmer skeleton immediately.

TOOL_CALL_RESULT (tool returns)
  → Phase 1: ACTIVITY_SNAPSHOT (messageId=A, replace=true)
      operations:
        beginRendering  { surfaceId: "<real-surface-id>", root: "<root-id>" }
        surfaceUpdate   { components: [{ id: "<root-id>",
                                         component: { "ProductCarousel": { … real props … } } }] }
        dataModelUpdate { surfaceId: "<real-surface-id>", contents: [ … product data … ] }
      Effect: activitySurfaces[A] skeleton surfaces deleted; real surface created; shimmer replaced.

  → Phase 2: ACTIVITY_SNAPSHOT (messageId=B, replace=true)  ← always a separate messageId
      operations:
        beginRendering  { surfaceId: "next-actions-surface", root: "next-actions-root" }
        surfaceUpdate   { components: [{ id: "next-actions-root",
                                         component: { "NextActionsBar": { … } } }] }
        dataModelUpdate { surfaceId: "next-actions-surface", contents: [ … actions … ] }
      Effect: NextActionsBar rendered after all product surfaces.
```

### Skeleton surface ID conventions

| Tool                      | Skeleton surface ID               | Component                             |
| ------------------------- | --------------------------------- | ------------------------------------- |
| `render_product_carousel` | `skeleton-surface-<slug>`         | `ProductCarousel { isLoading: true }` |
| `render_comparison_table` | `skeleton-surface-comparison`     | `ComparisonTable { isLoading: true }` |
| `render_bundle_display`   | `skeleton-surface-bundle-display` | `BundleDisplay { isLoading: true }`   |
| `render_next_actions`     | `skeleton-surface-next-actions`   | `NextActionsBar { isLoading: true }`  |

---

## 12. React state persistence (`a2uiSurfaces`)

Surfaces are persisted into `ConversationMessage.metadata.a2uiSurfaces` as a
`Record<string, SerializableSurfaceState>` so that they survive React
re-renders, page navigations (via `ConversationRecord` state), and SSR
hydration.

After each `ACTIVITY_SNAPSHOT` the hook calls `syncA2UISurfaces()`, which:

1. Iterates `surfaceManager.getAllSurfaceIds()`.
2. Calls `serializeSurface(surface)` for each.
3. Writes the result into `message.metadata.a2uiSurfaces` via `applyUpdate`.

At render time, the chat message component reads
`message.metadata.a2uiSurfaces`, calls `deserializeSurface(serialized)` for
each entry to reconstruct live `SurfaceState` objects, and passes them to
`SurfaceRenderer`.

The `deserializeSurface` path uses `dataModel.setAll(dataModelData)` to
restore already-resolved JS values rather than re-parsing the wire format,
avoiding any possibility of double-deserialization.
