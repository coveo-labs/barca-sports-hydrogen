# Commerce A2UI Component Schema

This document describes the commerce A2UI contract implemented by `agent-smith`.
It is intended as a stable reference for backend contributors, prompt authors,
and client/rendering integrators.

The A2UI v0.8 specification is the baseline contract. This document focuses on
the commerce-specific surface conventions, component shapes, and lifecycle
expectations used by `agent-smith`.

## Scope

This document covers:

- intent-to-component mapping
- surface naming conventions
- component payload expectations
- `dataModelUpdate` shapes used by commerce rendering
- activity ordering expectations
- bundle-specific client requirements

## Intent to Rendering Mapping

| Intent         | Expected components                                                    |
| -------------- | ---------------------------------------------------------------------- |
| `SIMPLE`       | `ProductCarousel` + `NextActionsBar`                                   |
| `MULTI-INTENT` | one `ProductCarousel` per category surface + `NextActionsBar`          |
| `COMPARISON`   | `ComparisonTable` + `ComparisonSummary` + `NextActionsBar`             |
| `BUNDLE`       | `bundle-surface-*` slot surfaces + `BundleDisplay` + `NextActionsBar`  |
| `RESEARCH`     | optional short text, then normal render path for the resolved category |

## Surface Conventions

| Surface                              | Meaning                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `product-surface`                    | default single-category carousel surface                           |
| `product-surface-<slug>`             | named carousel surface for single-category or multi-intent results |
| `comparison-surface`                 | comparison table surface                                           |
| `comparison-summary-surface`         | comparison summary text surface                                    |
| `bundle-surface-<tier>-<slot_index>` | bundle slot surface for one selected product                       |
| `bundle-display-surface`             | bundle assembly/config surface                                     |
| `next-actions-surface`               | next-actions bar surface                                           |

### Slug Rules

- Slugs are lowercase and should be stable within a response.
- Multi-intent responses use one unique product surface per category.
- Bundle searches use `listing_surface_id=<slug>` and then reuse that slug in
  `render_bundle_slot(search_surface_id=...)`.

## Event Lifecycle

Commerce rendering uses a batched lifecycle:

1. The assistant calls a rendering tool.
2. A skeleton `ACTIVITY_SNAPSHOT` is emitted when the render tool starts.
3. Search/product batches may arrive as `STATE_SNAPSHOT` events.
4. Render-tool operations are accumulated in the operation store.
5. A content `ACTIVITY_SNAPSHOT` is emitted after the render block is ready.
6. `render_next_actions` is emitted as a trailing snapshot after the main
   content snapshot.

### Important Notes

- `agent-smith` intentionally batches contiguous render-tool results into one
  content snapshot rather than flushing one snapshot per render tool call.
- `render_next_actions` is treated as a separate trailing block so the UI sees
  content first and actions last.
- `render_bundle_slot` is preparatory. It creates slot surfaces used later by
  `BundleDisplay`, but it is not itself the final bundle assembly view.

## Component Schemas

## 1. ProductCarousel

### Purpose

Render a product list for one category or intent bucket.

### Surface

- `product-surface`
- `product-surface-<slug>`

### surfaceUpdate shape

```json
{
  "surfaceUpdate": {
    "surfaceId": "product-surface-kayaks",
    "components": [
      {
        "id": "root-product-surface-kayaks",
        "component": {
          "ProductCarousel": {
            "heading": {"literalString": "Kayaks"},
            "products": {
              "componentId": "product-card-product-surface-kayaks",
              "dataBinding": "/items"
            }
          }
        }
      }
    ]
  }
}
```

### dataModelUpdate shape

`ProductCarousel` is data-bound. The surface expects:

```json
{
  "dataModelUpdate": {
    "surfaceId": "product-surface-kayaks",
    "contents": [
      {
        "key": "items",
        "valueMap": [
          {
            "key": "0",
            "valueMap": [
              {"key": "ec_product_id", "valueString": "..."},
              {"key": "ec_name", "valueString": "..."},
              {"key": "ec_brand", "valueString": "..."},
              {"key": "ec_price", "valueNumber": 199.0},
              {"key": "ec_promo_price", "valueNumber": 149.0},
              {"key": "ec_image", "valueString": "..."},
              {"key": "clickUri", "valueString": "/products/..."}
            ]
          }
        ]
      }
    ]
  }
}
```

### Required product fields

- `ec_product_id`
- `ec_name`
- `ec_brand`
- `ec_price`
- `ec_image`

### Common optional fields

- `ec_promo_price`
- `ec_description`
- `ec_category`
- `ec_rating`
- `clickUri`

## 2. ComparisonTable

### Purpose

Render a side-by-side comparison of 2-3 products.

### Surface

- `comparison-surface`

### surfaceUpdate shape

```json
{
  "surfaceUpdate": {
    "surfaceId": "comparison-surface",
    "components": [
      {
        "id": "root-comparison-surface",
        "component": {
          "ComparisonTable": {
            "heading": {"literalString": "Surfboards"},
            "products": {
              "componentId": "comparison-card-comparison-surface",
              "dataBinding": "/items"
            },
            "attributes": ["standout", "trade_off", "best_for"]
          }
        }
      }
    ]
  }
}
```

### dataModelUpdate shape

`ComparisonTable` is data-bound and receives the same `items` collection shape
as product carousel surfaces. The transformer injects the canonical commerce
fields and merges any comparison annotations keyed by `ec_product_id`.

### Notes

- `price` is always implied by the canonical fields and should not be passed as
  a custom attribute.
- Custom comparison columns are passed through `attributes`.
- Product annotation payloads are merged server-side before the final snapshot.

## 3. ComparisonSummary

### Purpose

Render a short recommendation or trade-off summary after a comparison table.

### Surface

- `comparison-summary-surface`

### surfaceUpdate shape

```json
{
  "surfaceUpdate": {
    "surfaceId": "comparison-summary-surface",
    "components": [
      {
        "id": "root-comparison-summary-surface",
        "component": {
          "ComparisonSummary": {
            "text": {"literalString": "Best overall: ..."}
          }
        }
      }
    ]
  }
}
```

### dataModelUpdate

None. This is a config-only component.

## 4. Bundle Slot Surfaces

### Purpose

Represent one selected product for one tier/slot pair in a bundle.

### Surface

- `bundle-surface-<tier>-<slot_index>`

### surfaceUpdate / dataModelUpdate behavior

Bundle slot surfaces behave like single-product product-card surfaces. They are
hydrated through the standard `items` data model and later referenced by
`BundleDisplay`.

### Notes

- Slot surfaces are a backend and client contract, not a user-facing final
  layout on their own.
- Clients may choose not to render these surfaces independently.

## 5. BundleDisplay

### Purpose

Render the assembled bundle layout after all bundle slot surfaces have been
declared.

### Surface

- `bundle-display-surface`

### surfaceUpdate shape

```json
{
  "surfaceUpdate": {
    "surfaceId": "bundle-display-surface",
    "components": [
      {
        "id": "root-bundle-display-surface",
        "component": {
          "BundleDisplay": {
            "title": {"literalString": "Surf Kit"}
          }
        }
      }
    ]
  }
}
```

### Bundle config payload

`BundleDisplay` receives bundle structure through a backend-private operation
that resolves into the final component payload:

```json
{
  "bundles": [
    {
      "bundleId": "essential",
      "label": "Essential",
      "description": "Lower-cost starting setup",
      "slots": [
        {
          "categoryLabel": "Surfboard",
          "surfaceRef": "bundle-surface-essential-0"
        },
        {
          "categoryLabel": "Wetsuit",
          "surfaceRef": "bundle-surface-essential-1"
        }
      ]
    }
  ]
}
```

### dataModelUpdate

None. `BundleDisplay` is config-only.

### Client requirement

`BundleDisplay` does not carry inline product records. Clients must resolve each
`surfaceRef` against previously stored `bundle-surface-*` product state.

This is an intentional portability constraint of the bundle contract.

## 6. NextActionsBar

### Purpose

Render suggested follow-up actions at the end of the response.

### Surface

- `next-actions-surface`

### surfaceUpdate shape

```json
{
  "surfaceUpdate": {
    "surfaceId": "next-actions-surface",
    "components": [
      {
        "id": "root-next-actions-surface",
        "component": {
          "NextActionsBar": {
            "actions": {
              "componentId": "button-next-actions-surface",
              "dataBinding": "/actions"
            }
          }
        }
      }
    ]
  }
}
```

### dataModelUpdate shape

```json
{
  "dataModelUpdate": {
    "surfaceId": "next-actions-surface",
    "contents": [
      {
        "key": "actions",
        "valueMap": [
          {
            "key": "0",
            "valueMap": [
              {"key": "text", "valueString": "Compare the top 3 options"},
              {"key": "type", "valueString": "followup"}
            ]
          }
        ]
      }
    ]
  }
}
```

### Action rules

- 1-5 actions
- `type` must be `followup` or `search`
- `render_next_actions` is the final rendering tool call in a response

## Skeleton Components

Skeletons are emitted at render-tool start and are later replaced in-place by
the real snapshot.

Current skeleton surfaces:

- `skeleton-surface-default`
- `skeleton-surface-comparison`
- `skeleton-surface-bundle-display`
- `skeleton-surface-next-actions`

Current skeleton components:

- `ProductCarousel`
- `ComparisonTable`
- `BundleDisplay`
- `NextActionsBar`

## Data Model Conventions

Commerce `dataModelUpdate` operations use:

- `surfaceId`
- `contents`
- `valueMap`
- `valueString`
- `valueNumber`

Important conventions:

- `path` is not included in commerce `dataModelUpdate`
- item collections are keyed under `items`
- next actions are keyed under `actions`
- product keys preserve canonical commerce field names such as `ec_name`,
  `ec_brand`, `ec_price`, `ec_promo_price`, `ec_image`, and `clickUri`

## Bundle Portability Constraint

Bundle rendering depends on cross-activity client state:

1. slot product surfaces arrive first
2. `BundleDisplay` arrives later with `surfaceRef` values
3. the client must retain prior surface/data-model state to hydrate the bundle

A stateless client that renders each activity snapshot independently will not be
able to fully hydrate `BundleDisplay`.

## Invariants

- Do not invent product fields or IDs.
- `register_products` is for prior-turn shown products only.
- Same-turn category comparisons should prefer current-turn search results over
  re-registering those same products.
- `render_next_actions` is the final rendering tool call in the response.
- `BundleDisplay` is config-only and depends on prior slot surfaces.

## Minimal Examples

### SIMPLE

- `coveo_commerce_search(query="wetsuits", surface_id="product-surface-wetsuits")`
- `render_product_carousel(surface_id="product-surface-wetsuits", heading="Wetsuits")`
- `render_next_actions(...)`

### MULTI-INTENT

- `coveo_commerce_search(query="wetsuits", surface_id="product-surface-wetsuits")`
- `coveo_commerce_search(query="sunglasses", surface_id="product-surface-sunglasses")`
- `render_product_carousel(surface_id="product-surface-wetsuits", heading="Wetsuits")`
- `render_product_carousel(surface_id="product-surface-sunglasses", heading="Sunglasses")`
- `render_next_actions(...)`

### COMPARISON

- `coveo_commerce_search(query="surfboards", surface_id="comparison-surface")`
- `render_comparison_table(surface_id="comparison-surface", ...)`
- `render_comparison_summary(text="...")`
- `render_next_actions(...)`

### BUNDLE

- one `coveo_commerce_search(..., listing_surface_id=<slug>)` per category
- one `render_bundle_slot(...)` per slot per tier
- one `render_bundle_display(...)`
- one `render_next_actions(...)`
