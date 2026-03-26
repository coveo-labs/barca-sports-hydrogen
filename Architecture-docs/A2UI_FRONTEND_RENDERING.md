# A2UI Frontend Rendering

This document explains how A2UI activity snapshots are processed and rendered
in the conversational flow.

Read
[CONVERSATIONAL_FLOW.md](./CONVERSATIONAL_FLOW.md)
first if you want the broader page, streaming, and state-management picture.

## 1. Scope

This doc is about the A2UI path only:

- which A2UI events the frontend receives
- how snapshot operations mutate surfaces and data models
- how skeleton snapshots are replaced
- how surfaces are stored on assistant messages
- how those surfaces are finally rendered through `ResponseContent`

It is intentionally implementation-specific.

## 2. End-to-End Pipeline

```text
ACTIVITY_SNAPSHOT event
  -> StreamA2UIAdapter
  -> A2UIMessageProcessor
  -> SurfaceManager
  -> DataModelStore
  -> serialized message.metadata.a2uiSurfaces
  -> MessageBubble
  -> SurfaceRenderer
  -> ComponentRenderer
  -> component-registry / component-renderers
  -> ResponseContent/components/*
```

## 3. File Map

### Stream boundary

- `app/lib/generative/adapters/a2ui/stream-a2ui-adapter.ts`
- `app/lib/generative/adapters/a2ui/types.ts`
- `app/lib/generative/streaming/types.ts`

### A2UI processing and state

- `app/lib/a2ui/message-processor.ts`
- `app/lib/a2ui/surface-manager.ts`
- `app/lib/a2ui/data-model-store.ts`
- `app/lib/a2ui/data-binding-resolver.ts`

### Response rendering

- `app/components/Generative/ResponseContent/MessageBubble.tsx`
- `app/components/Generative/ResponseContent/rendering/SurfaceRenderer.tsx`
- `app/components/Generative/ResponseContent/rendering/ComponentRenderer.tsx`
- `app/components/Generative/ResponseContent/rendering/component-registry.ts`
- `app/components/Generative/ResponseContent/rendering/component-renderers.tsx`
- `app/components/Generative/ResponseContent/rendering/render-context.ts`
- `app/components/Generative/ResponseContent/components/*`

## 4. Event Shape

The conversational stream types are defined in:

- `app/lib/generative/streaming/types.ts`

The A2UI event used by the frontend is:

```ts
type ActivitySnapshotEvent = {
  type: 'ACTIVITY_SNAPSHOT';
  messageId: string;
  activityType: 'a2ui-surface';
  content: {
    operations: A2UIOperation[];
  };
  replace?: boolean;
};
```

The supported A2UI operations are:

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

These operations are applied in order for each snapshot.

## 5. Adapter Boundary

The stream session does not manipulate A2UI internals directly. It hands
`ACTIVITY_SNAPSHOT` events to:

- `app/lib/generative/adapters/a2ui/stream-a2ui-adapter.ts`

`StreamA2UIAdapter` is responsible for:

- accepting `ACTIVITY_SNAPSHOT` events
- forwarding them to `A2UIMessageProcessor`
- serializing current surfaces into `message.metadata.a2uiSurfaces`
- exposing whether any A2UI content has been synced yet

This is the boundary between:

- generic stream/session logic
- A2UI-specific structured response handling

## 6. Snapshot Processing

Snapshot processing is handled by:

- `app/lib/a2ui/message-processor.ts`

`A2UIMessageProcessor` has two important responsibilities:

1. apply the operations inside a single snapshot
2. track which surfaces belong to a given activity `messageId`

The second responsibility is what makes snapshot replacement work.

### Replacement behavior

When a snapshot arrives with:

- the same `messageId` as an earlier snapshot
- `replace: true`

the processor deletes the surfaces previously associated with that activity
message before applying the new operations.

That is how the frontend handles the common sequence:

- skeleton snapshot
- final content snapshot

for the same logical response fragment.

## 7. SurfaceManager

Surface operations are applied by:

- `app/lib/a2ui/surface-manager.ts`

Each surface is stored as a `SurfaceState`:

```ts
type SurfaceState = {
  surfaceId: string;
  root: string | null;
  catalogId: string | null;
  components: Map<string, ComponentDefinition>;
  dataModel: DataModelStore;
  isRendered: boolean;
};
```

### Operation behavior

#### `beginRendering`

Sets the surface-level render metadata:

- `surfaceId`
- `root`
- `catalogId`
- `isRendered = true`

Without this, the surface is not considered renderable.

#### `surfaceUpdate`

Upserts component definitions into `surface.components`.

The current implementation derives `catalogComponentId` from the first key in
the wire-format `component` object.

Example:

```json
{
  "id": "root",
  "component": {
    "ProductCarousel": {
      "heading": {"literalString": "Suggested canoes"}
    }
  }
}
```

becomes a component definition whose `catalogComponentId` is
`ProductCarousel`.

#### `dataModelUpdate`

Passes `contents` into the surface's `DataModelStore`.

This is where the actual bound data for products, comparison rows, next
actions, and similar structures gets populated.

#### `deleteSurface`

Removes the entire surface from the in-memory map.

## 8. DataModelStore

Data model updates are applied by:

- `app/lib/a2ui/data-model-store.ts`

`DataModelStore` converts wire-format entries into plain JS values and exposes
pointer-style lookup with `get(path)`.

### Supported primitive entries

An entry can become:

- `valueString`
- `valueNumber`
- `valueBoolean`
- `null`

### Nested object / list handling

`valueMap` entries are recursively converted.

Important behavior in the current implementation:

- anonymous list entries become arrays
- indexed string keys like `"0"`, `"1"`, `"2"` also become arrays
- everything else becomes an object map

That indexed-list support is important for the current commerce agent payloads,
because item collections can arrive as keyed map entries rather than anonymous
lists.

### Runtime lookup

Renderers and binding resolution read data through:

- `surface.dataModel.get(path)`

This is the main bridge between `dataModelUpdate` operations and component
props.

## 9. Binding Resolution

Binding resolution happens in:

- `app/lib/a2ui/data-binding-resolver.ts`

The key responsibilities there are:

- resolve bound component props against the current `DataModelStore`
- resolve templated list items
- support the A2UI-style data binding references used by catalog components

By the time a component reaches `ComponentRenderer`, its bound values are
already normalized through this layer.

## 10. How Surfaces Reach the Assistant Message

After snapshot processing, `StreamA2UIAdapter` serializes all current surfaces
into assistant message metadata:

- `message.metadata.a2uiSurfaces`

The surfaces are serialized because React conversation state stores plain data,
not live `Map` instances and class objects.

The serialization helpers live in:

- `app/lib/a2ui/surface-manager.ts`

This means the assistant message becomes the persistence boundary for A2UI
content inside the conversational UI.

## 11. MessageBubble as the Bridge

Rendering starts in:

- `app/components/Generative/ResponseContent/MessageBubble.tsx`

For text assistant messages:

- if `a2uiSurfaces` is empty, `MessageBubble` renders plain answer content
- if `a2uiSurfaces` is present, `MessageBubble` deserializes each surface and
  renders it through `SurfaceRenderer`

So `MessageBubble` is the bridge between:

- conversational message rendering
- structured surface rendering

## 12. SurfaceRenderer

Surface tree rendering happens in:

- `app/components/Generative/ResponseContent/rendering/SurfaceRenderer.tsx`

This file handles surface-level render rules.

### What it does

- skips surfaces that are not ready:
  - `!surface.isRendered`
  - `!surface.root`
- hides `bundle-surface-*` because those surfaces are data-only support surfaces
- marks `skeleton-surface-*` as skeleton surfaces
- walks container/layout nodes like:
  - `Column`
  - `Row`
  - `List`
  - `Card`
  - `ConversationAnswer`
- dispatches leaf components to `ComponentRenderer`
- renders `NextActionsBar` after other sibling nodes

### Why bundle surfaces are hidden

Bundle slot surfaces are kept in the surface map so components like
`BundleDisplay` can resolve product data out of them, but they are not supposed
to appear as standalone assistant UI.

## 13. ComponentRenderer and Registry

Files:

- `app/components/Generative/ResponseContent/rendering/ComponentRenderer.tsx`
- `app/components/Generative/ResponseContent/rendering/component-registry.ts`
- `app/components/Generative/ResponseContent/rendering/component-renderers.tsx`
- `app/components/Generative/ResponseContent/rendering/render-context.ts`

### `ComponentRenderer`

Responsibilities:

- resolve bound props via `resolveComponentBindings`
- create `ResponseRenderContext`
- create `ResponseInteractionHandlers`
- dispatch by `catalogComponentId` through the registry

### `component-registry`

Maps `catalogComponentId` values to renderer functions.

### `component-renderers`

Contains the adapter functions that translate A2UI component definitions into
the props expected by the actual React UI components.

This is the main seam between:

- A2UI catalog components
- local React presentation components

## 14. UI Components

The actual presentational components live in:

- `app/components/Generative/ResponseContent/components/`

Important examples:

- `ProductCarousel.tsx`
- `ComparisonTable.tsx`
- `ComparisonSummary.tsx`
- `BundleDisplay.tsx`
- `NextActionsBar.tsx`
- `A2UIProductCard.tsx`
- `ProductDrawer.tsx`
- `ConversationAnswer.tsx`
- `Skeletons.tsx`

These files should stay presentation-focused. They render the UI for already
processed and already-bound data.

## 15. Skeleton Lifecycle

The frontend no longer relies on backend `isLoading` props to decide whether a
surface is a skeleton.

Current rule:

- if `surfaceId` starts with `skeleton-surface-`, the surface is treated as a
  skeleton surface

That flag is created in `SurfaceRenderer` and passed down through
`ComponentRenderer` into the relevant UI components.

The component type still determines the skeleton shape:

- `ProductCarousel` -> carousel skeleton
- `ComparisonTable` -> comparison skeleton
- `BundleDisplay` -> bundle skeleton
- `NextActionsBar` -> next-actions skeleton

So:

- `surfaceId` answers "is this skeleton content?"
- `catalogComponentId` answers "which skeleton UI should render?"

## 16. Typical Snapshot Timeline

The common lifecycle for structured commerce content looks like:

1. A skeleton `ACTIVITY_SNAPSHOT` arrives with `replace: true`.
2. `A2UIMessageProcessor` creates skeleton surfaces and associates them with the
   snapshot `messageId`.
3. The adapter serializes those surfaces into `message.metadata.a2uiSurfaces`.
4. `MessageBubble` renders the skeleton surface through `SurfaceRenderer`.
5. A later `ACTIVITY_SNAPSHOT` arrives with the same activity `messageId` and
   `replace: true`.
6. `A2UIMessageProcessor` deletes the earlier skeleton surfaces.
7. The new operations build the final surfaces and data models.
8. The adapter serializes the new surfaces.
9. `MessageBubble` re-renders with the final content.

That is the core skeleton-to-content replacement contract.

## 17. Where To Make Changes

### Change event processing or replacement behavior

- `app/lib/a2ui/message-processor.ts`
- `app/lib/a2ui/surface-manager.ts`

### Change data-model interpretation

- `app/lib/a2ui/data-model-store.ts`
- `app/lib/a2ui/data-binding-resolver.ts`

### Change how A2UI content is attached to assistant messages

- `app/lib/generative/adapters/a2ui/stream-a2ui-adapter.ts`

### Change surface-level rendering rules

- `app/components/Generative/ResponseContent/rendering/SurfaceRenderer.tsx`

### Change component dispatch or A2UI-to-React mapping

- `app/components/Generative/ResponseContent/rendering/ComponentRenderer.tsx`
- `app/components/Generative/ResponseContent/rendering/component-registry.ts`
- `app/components/Generative/ResponseContent/rendering/component-renderers.tsx`

### Change specific UI components

- `app/components/Generative/ResponseContent/components/*`

## 18. Summary

The A2UI path in this repo is:

- event-driven at the stream boundary
- surface-based in memory
- data-model-backed for bindings
- serialized onto assistant message metadata
- rendered through the `ResponseContent` stack

That is the mental model to keep in mind when working on structured
conversational responses.
