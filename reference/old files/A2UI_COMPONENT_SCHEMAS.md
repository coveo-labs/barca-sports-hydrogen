# A2UI Component Wire Format Schemas

This document is the authoritative reference for the **wire format** produced by each rendering tool and the transformer. It is intended for frontend developers working with `ComponentRenderer.tsx`, `DataModelStore`, and `SurfaceRenderer`.

Every rendering tool call produces up to three `ACTIVITY_SNAPSHOT` events in fixed order:

1. **Phase 0 — Skeleton snapshot** (at `TOOL_CALL_START`): placeholder surface emitted immediately so the UI shows loading state during tool execution
2. **Phase 1 — Content snapshot** (at `TOOL_CALL_RESULT`): one or more product/comparison/bundle surfaces; uses the **same `message_id`** as the skeleton → frontend replaces skeleton in-place
3. **Phase 2 — Next-actions snapshot**: `next-actions-surface` only; always last, always a fresh `message_id`

Phases 0–1 share an `activity_id`; Phase 2 always has its own. The split is enforced unconditionally by `_emit_skeleton_for_tool` (Phase 0) and `_try_emit_operations_snapshot` (Phases 1–2) in `transformer.py`.

---

## Global Schema Rules

- All `ACTIVITY_SNAPSHOT` events have `"replace": true` (surfaces are replaced, not merged).
- `message_id` uses snake_case (not camelCase).
- Inside `dataModelUpdate.contents`, string scalars use `"valueString"`, numeric scalars use `"valueNumber"`.
- Top-level key inside `dataModelUpdate` is `"contents"` (not `"data"`).
- The spec has no `"valueList"` type. Arrays of homogeneous items are represented as anonymous `{"valueMap": [...]}` entries nested inside a parent `"valueMap"` array. The frontend `DataModelStore` detects this list pattern when the first entry has no `key` and contains its own `valueMap`.
- No `"path": "/"` field anywhere.
- `surfaceUpdate.components` is a flat array; each entry has `"id"` + `"component"` (object keyed by component type name).

---

## 1. ProductCarousel

**Intent types**: Simple, Multi-Intent  
**Surface ID pattern**: `product-surface` (single-intent) or `product-surface-<slug>` (multi-intent)  
**Rendering tool**: `render_product_carousel(surface_id, heading)`

### Full wire example

```json
{
  "type": "ACTIVITY_SNAPSHOT",
  "timestamp": 1771466759566,
  "message_id": "activity-<uuid>",
  "activityType": "a2ui-surface",
  "content": {
    "operations": [
      {
        "beginRendering": {
          "surfaceId": "product-surface-kayaks",
          "root": "root-product-surface-kayaks"
        }
      },
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
      },
      {
        "dataModelUpdate": {
          "surfaceId": "product-surface-kayaks",
          "contents": [
            {
              "key": "items",
              "valueMap": [
                {
                  "valueMap": [
                    {
                      "key": "ec_name",
                      "valueString": "Black Kevlar Sport Kayak"
                    },
                    {"key": "ec_brand", "valueString": "Barca Sports"},
                    {"key": "ec_price", "valueNumber": 2450.0},
                    {"key": "ec_promo_price", "valueNumber": 2205.0},
                    {
                      "key": "ec_image",
                      "valueString": "https://images.barca.group/..."
                    },
                    {"key": "ec_product_id", "valueString": "SP04067_00001"}
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  },
  "replace": true
}
```

### Notes

- `heading` is always a `literalString` — the LLM provides it; the transformer does not change it.
- `products.dataBinding` is always `"/items"`.
- `products.componentId` is `"product-card-<surface_id>"`.
- `ec_promo_price` is omitted from the `valueMap` if the product has no promo price.
- `ec_image` is derived from `ec_images[0]` by `build_data_model_update` — the LLM never writes image URLs.
- String fields use `"valueString"`; price fields use `"valueNumber"` (float, not string).
- Up to 6 items for single-intent; up to 3 per category for multi-intent.

### Frontend bindings (`ComponentRenderer.tsx`)

| Prop       | Source                                     | Type                  |
| ---------- | ------------------------------------------ | --------------------- |
| `heading`  | `resolved.heading` (literalString)         | `string \| undefined` |
| `products` | `resolveTemplateData("/items", dataModel)` | `any[]`               |

---

## 2. ComparisonTable

**Intent types**: Comparison  
**Surface ID**: `comparison-surface` (always fixed)  
**Rendering tool**: `render_comparison_table(surface_id, heading, attributes, products)`

### Full wire example

```json
{
  "type": "ACTIVITY_SNAPSHOT",
  "timestamp": 1771466759600,
  "message_id": "activity-<uuid>",
  "activityType": "a2ui-surface",
  "content": {
    "operations": [
      {
        "beginRendering": {
          "surfaceId": "comparison-surface",
          "root": "root-comparison-surface"
        }
      },
      {
        "surfaceUpdate": {
          "surfaceId": "comparison-surface",
          "components": [
            {
              "id": "root-comparison-surface",
              "component": {
                "ComparisonTable": {
                  "heading": {"literalString": "Kayak A vs Kayak B vs Kayak C"},
                  "products": {
                    "componentId": "card-comparison-surface",
                    "dataBinding": "/items"
                  },
                  "attributes": [
                    "key_spec",
                    "standout",
                    "trade_off",
                    "best_for"
                  ]
                }
              }
            },
            {
              "id": "card-comparison-surface",
              "component": {
                "ProductCard": {
                  "ec_product_id": {"path": "ec_product_id"},
                  "ec_name": {"path": "ec_name"},
                  "ec_brand": {"path": "ec_brand"},
                  "ec_image": {"path": "ec_image"},
                  "ec_price": {"path": "ec_price"},
                  "ec_promo_price": {"path": "ec_promo_price"}
                }
              }
            }
          ]
        }
      },
      {
        "dataModelUpdate": {
          "surfaceId": "comparison-surface",
          "contents": [
            {
              "key": "items",
              "valueMap": [
                {
                  "valueMap": [
                    {
                      "key": "ec_name",
                      "valueString": "Black Kevlar Sport Kayak"
                    },
                    {"key": "ec_brand", "valueString": "Barca Sports"},
                    {"key": "ec_price", "valueNumber": 2450.0},
                    {"key": "ec_promo_price", "valueNumber": 2205.0},
                    {
                      "key": "ec_image",
                      "valueString": "https://images.barca.group/..."
                    },
                    {"key": "ec_product_id", "valueString": "SP04067_00001"},
                    {
                      "key": "standout",
                      "valueString": "Extremely lightweight hull"
                    },
                    {"key": "trade_off", "valueString": "Higher price point"},
                    {"key": "best_for", "valueString": "Competitive racers"}
                  ]
                },
                {
                  "valueMap": [
                    {"key": "ec_name", "valueString": "Touring Pro Kayak"},
                    {"key": "ec_brand", "valueString": "Barca Sports"},
                    {"key": "ec_price", "valueNumber": 1850.0},
                    {
                      "key": "ec_image",
                      "valueString": "https://images.barca.group/..."
                    },
                    {"key": "ec_product_id", "valueString": "SP00584_00005"},
                    {
                      "key": "standout",
                      "valueString": "Stable for long distances"
                    },
                    {
                      "key": "trade_off",
                      "valueString": "Heavier than racing models"
                    },
                    {"key": "best_for", "valueString": "Multi-day touring"}
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  },
  "replace": true
}
```

### Notes

- `surfaceUpdate` contains **two** component entries: `ComparisonTable` (root) + `ProductCard` (template).
- `attributes` in `ComparisonTable` is a plain JSON array of strings — the LLM chooses based on what is decision-driving.
- `ec_*` fields (name, brand, price, promo_price, image, product_id) are injected by the transformer from the product store — the LLM provides only `ec_product_id` + custom attr values.
- Custom attrs are appended to each item's `valueMap` **after** the `ec_*` entries by the transformer's comparison rebuild block.
- `ec_promo_price` is omitted per product if not present.
- `"price"` must NOT appear in `attributes` — it is always rendered from `ec_price`/`ec_promo_price`.

### `attributes` selection guide

| Key         | When to include                                                                               |
| ----------- | --------------------------------------------------------------------------------------------- |
| `key_spec`  | Primary category differentiator (volume for surfboards, capacity for bags, etc.) — if present |
| `standout`  | What the product excels at                                                                    |
| `trade_off` | The main limitation or trade-off                                                              |
| `best_for`  | Persona or use-case fit                                                                       |

Defaults: `["key_spec", "standout", "trade_off", "best_for"]` when a key spec exists; `["standout", "trade_off", "best_for"]` otherwise.

### Frontend bindings (`ComponentRenderer.tsx`)

Products are resolved via `resolveTemplateData("/items", dataModel)` which returns raw `valueMap` entries. The frontend maps them to its internal shape:

```ts
{
  productId: p.ec_product_id,
  name:      p.ec_name,
  imageUrl:  p.ec_image,
  price:     isOnSale ? promoPrice : regularPrice,
  originalPrice: isOnSale ? regularPrice : undefined,
  currency:  p.ec_currency || 'USD',
  url:       p.clickUri || '#',
  // All remaining keys (standout, trade_off, best_for, key_spec) spread through
  ...p,
}
```

Custom attributes are accessed as `product[attr]` when the table renders comparison rows.

---

## 3. ComparisonSummary (`comparison-summary-surface`)

**Intent types**: Comparison  
**Surface ID**: `comparison-summary-surface` (always fixed)  
**Rendering tool**: `render_comparison_summary(text)`

Always emitted **after** `render_comparison_table` and **before** `render_next_actions`. Renders a short summary block with trade-off analysis and a product recommendation.

### Full wire example

```json
{
  "type": "ACTIVITY_SNAPSHOT",
  "timestamp": 1771466759605,
  "message_id": "activity-<uuid>",
  "activityType": "a2ui-surface",
  "content": {
    "operations": [
      {
        "beginRendering": {
          "surfaceId": "comparison-summary-surface",
          "root": "root-comparison-summary-surface"
        }
      },
      {
        "surfaceUpdate": {
          "surfaceId": "comparison-summary-surface",
          "components": [
            {
              "id": "root-comparison-summary-surface",
              "component": {
                "ComparisonSummary": {
                  "text": {
                    "literalString": "The Black Kevlar Sport Kayak is the fastest option but costs more; the Touring Pro is the better all-rounder for most paddlers."
                  }
                }
              }
            }
          ]
        }
      }
    ]
  },
  "replace": true
}
```

### Notes

- `text` is always a `literalString` — the LLM writes the summary prose directly; no data binding, no `dataModelUpdate`.
- `comparison-summary-surface` is in `_NO_PRODUCTS_SURFACES` — skipped by the product routing loop.
- The `text` value must be 1–3 sentences, reference at least two product names by name, and end with a clear recommendation.
- No template component; the root component IS the `ComparisonSummary`.

### Frontend bindings (`ComponentRenderer.tsx`)

| Prop   | Source                               | Type     |
| ------ | ------------------------------------ | -------- |
| `text` | `resolvedProps.text` (literalString) | `string` |

---

## 4. Bundle Slots (`bundle-surface-<tier>-<N>`)

**Intent types**: Bundle  
**Surface ID pattern**: `bundle-surface-<tier>-<slot_index>` (e.g. `bundle-surface-essential-0`)  
**Rendering tool**: `render_bundle_slot(surface_id, tier, slot_index, heading, ec_product_id)`

### Full wire example (single slot)

```json
{
  "type": "ACTIVITY_SNAPSHOT",
  "timestamp": 1771466759620,
  "message_id": "activity-<uuid>",
  "activityType": "a2ui-surface",
  "content": {
    "operations": [
      {
        "beginRendering": {
          "surfaceId": "bundle-surface-essential-0",
          "root": "root-bundle-surface-essential-0"
        }
      },
      {
        "surfaceUpdate": {
          "surfaceId": "bundle-surface-essential-0",
          "components": [
            {
              "id": "root-bundle-surface-essential-0",
              "component": {
                "ProductCard": {
                  "ec_product_id": {"path": "ec_product_id"},
                  "ec_name": {"path": "ec_name"},
                  "ec_brand": {"path": "ec_brand"},
                  "ec_image": {"path": "ec_image"},
                  "ec_price": {"path": "ec_price"},
                  "ec_promo_price": {"path": "ec_promo_price"}
                }
              }
            }
          ]
        }
      },
      {
        "dataModelUpdate": {
          "surfaceId": "bundle-surface-essential-0",
          "contents": [
            {
              "key": "items",
              "valueMap": [
                {
                  "valueMap": [
                    {"key": "ec_name", "valueString": "Entry Kayak"},
                    {"key": "ec_brand", "valueString": "Barca Sports"},
                    {"key": "ec_price", "valueNumber": 799.0},
                    {
                      "key": "ec_image",
                      "valueString": "https://images.barca.group/..."
                    },
                    {"key": "ec_product_id", "valueString": "SP00123_00001"}
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  },
  "replace": true
}
```

### Notes

- Each slot surface carries exactly **one product** in the `valueList`.
- The LLM passes `ec_product_id` as a hint; the transformer validates it against `product_lookup` and enriches with full product data. If the ID is not found, it falls back to price-sort on that slot's batch.
- **Tier conflict resolution**: if both tiers for the same slot index end up choosing the same product, the transformer overrides via price sort — cheapest for starter tiers (`starter`, `essential`, `basic`, `entry`, `standard`), most expensive for premium tiers.
- Bundle slot surfaces are **not** in `_NO_PRODUCTS_SURFACES` — they go through the product routing loop.

### Starter vs premium tier slugs

Tier slugs listed in `_STARTER_TIER_SLUGS` (`starter`, `essential`, `basic`, `entry`, `standard`) → cheapest product from the slot's batch. All other tier slugs → most expensive product.

---

## 5. BundleDisplay (`bundle-display-surface`)

**Intent types**: Bundle  
**Surface ID**: `bundle-display-surface` (always fixed)  
**Rendering tool**: `render_bundle_display(title, bundles)`

The `BundleDisplay` component assembles the tabbed bundle UI. It references slot surfaces via `surfaceRef` — the frontend reads product data from the slot surfaces directly. The `bundle-display-surface` itself carries **no product data** and no `dataModelUpdate`.

### Full wire example

```json
{
  "type": "ACTIVITY_SNAPSHOT",
  "timestamp": 1771466759640,
  "message_id": "activity-<uuid>",
  "activityType": "a2ui-surface",
  "content": {
    "operations": [
      {
        "beginRendering": {
          "surfaceId": "bundle-display-surface",
          "root": "root-bundle-display-surface"
        }
      },
      {
        "surfaceUpdate": {
          "surfaceId": "bundle-display-surface",
          "components": [
            {
              "id": "root-bundle-display-surface",
              "component": {
                "BundleDisplay": {
                  "title": {"literalString": "Complete Surf Bundle"},
                  "bundles": [
                    {
                      "bundleId": "essential",
                      "label": "Essential",
                      "description": "Everything you need to get started surfing.",
                      "slots": [
                        {
                          "categoryLabel": "Surfboard",
                          "surfaceRef": "bundle-surface-essential-0"
                        },
                        {
                          "categoryLabel": "Wetsuit",
                          "surfaceRef": "bundle-surface-essential-1"
                        },
                        {
                          "categoryLabel": "Leash",
                          "surfaceRef": "bundle-surface-essential-2"
                        }
                      ]
                    },
                    {
                      "bundleId": "complete",
                      "label": "Complete",
                      "description": "Professional-grade gear for serious surfers.",
                      "slots": [
                        {
                          "categoryLabel": "Surfboard",
                          "surfaceRef": "bundle-surface-complete-0"
                        },
                        {
                          "categoryLabel": "Wetsuit",
                          "surfaceRef": "bundle-surface-complete-1"
                        },
                        {
                          "categoryLabel": "Leash",
                          "surfaceRef": "bundle-surface-complete-2"
                        }
                      ]
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    ]
  },
  "replace": true
}
```

### Notes

- `bundles` is an **inline array** on the `BundleDisplay` component — not a `dataBinding` and no `dataModelUpdate`.
- The transformer patches `bundles` into the `BundleDisplay` component dict inside the `surfaceUpdate` op, using the `_bundle_display` sentinel payload from `render_bundle_display`.
- `surfaceRef` values must match the `surface_id` strings previously passed to `render_bundle_slot` calls.
- `bundle-display-surface` is in `_NO_PRODUCTS_SURFACES` — skipped by the product routing loop.
- No `dataModelUpdate` op is ever appended for this surface.

### `_bundle_display` sentinel (from `render_bundle_display`)

```json
{
  "_bundle_display": {
    "surfaceId": "bundle-display-surface",
    "title": "Complete Surf Bundle",
    "bundles": [ ... ]
  }
}
```

The transformer locates the `surfaceUpdate` op for `bundle-display-surface`, finds the `BundleDisplay` component, and sets `component["BundleDisplay"]["bundles"] = bundles_payload`.

---

## 6. NextActionsBar (`next-actions-surface`)

**Intent types**: All (called at end of every response)  
**Surface ID**: `next-actions-surface` (always fixed)  
**Rendering tool**: `render_next_actions(actions)`

The next-actions snapshot is **always emitted as a separate Phase 2 snapshot**, never bundled with content surfaces.

### Full wire example

```json
{
  "type": "ACTIVITY_SNAPSHOT",
  "timestamp": 1771466759660,
  "message_id": "activity-<uuid>",
  "activityType": "a2ui-surface",
  "content": {
    "operations": [
      {
        "beginRendering": {
          "surfaceId": "next-actions-surface",
          "root": "root-next-actions-surface"
        }
      },
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
      },
      {
        "dataModelUpdate": {
          "surfaceId": "next-actions-surface",
          "contents": [
            {
              "key": "actions",
              "valueMap": [
                {
                  "valueMap": [
                    {"key": "text", "valueString": "Compare top 3"},
                    {"key": "type", "valueString": "followup"}
                  ]
                },
                {
                  "valueMap": [
                    {"key": "text", "valueString": "Show under $300"},
                    {"key": "type", "valueString": "followup"}
                  ]
                },
                {
                  "valueMap": [
                    {"key": "text", "valueString": "kayak wetsuits"},
                    {"key": "type", "valueString": "search"}
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  },
  "replace": true
}
```

### Notes

- `actions` data uses `dataBinding: "/actions"` (not `"/items"`).
- Each action item is a **flat** `valueMap` with exactly two fields: `text` (valueString) and `type` (valueString).
- No `variant`, no nested `action` object, no `message` or `query` sub-keys.
- `type` drives both icon and click behaviour: `"search"` → MagnifyingGlass icon, navigates to search; `"followup"` → ChatBubble icon, sends text back as a follow-up message.
- `text` serves as both the button label and the action payload (search query or follow-up message).
- 1–3 actions; at least one must be `"followup"` type.
- `next-actions-surface` is in `_NO_PRODUCTS_SURFACES` — skipped by the product routing loop.

### Action types

| Type       | Frontend behaviour                                | text field meaning      |
| ---------- | ------------------------------------------------- | ----------------------- |
| `followup` | Grey chip; sends `text` back to agent as new turn | The message to send     |
| `search`   | Grey chip; navigates to `/search?q=<text>`        | The search query string |

### `DataModelStore` deserialization

`DataModelStore.dataToValue` on the frontend detects a list when the first entry in a `valueMap` array has no `key` and contains its own `valueMap`. For `next-actions-surface`, the outer `actions` entry has `key: "actions"` and its `valueMap` is an array of anonymous items (no `key`), each containing a keyed `valueMap` — so it is deserialized as an array of plain JS objects. `NextActionsBar.tsx` reads them as:

```ts
action.text; // button label and action payload
action.type; // "search" | "followup"
```

---

## 7. Snapshot Ordering Guarantee

Every rendering tool call produces up to **three** `ACTIVITY_SNAPSHOT` events in this order:

```
Phase 0: Skeleton snapshot  (at TOOL_CALL_START)
  → Placeholder surface (e.g. skeleton-surface-default with empty items)
  → activity_id = A  (generated and stored in _skeleton_activity_ids)
  → replace=True

Phase 1: Content snapshot  (at TOOL_CALL_RESULT)
  → All non-next-actions surfaces (carousel(s) / comparison / bundle slots + display)
  → Single snapshot containing all content ops concatenated
  → activity_id = A  (same as skeleton → frontend replaces in-place)
  → replace=True

Phase 2: Next-actions snapshot
  → next-actions-surface only
  → Always last, always separate
  → activity_id = B  (fresh ID)
  → replace=True
```

Phases 0 and 1 share the same `activity_id`. When the frontend receives Phase 1, it replaces the skeleton surface in-place (no flash, no re-mount). Phase 2 always has a fresh `activity_id`.

For multi-intent with N carousels, the three-phase pattern repeats at each rendering tool call:

```
TOOL_CALL_START (render_product_carousel #1)
  → Phase 0: skeleton-surface-default (activity_id=A)

TOOL_CALL_RESULT (render_product_carousel #1)
  → Phase 1: product-surface-kayaks (activity_id=A, replaces skeleton)
  → Phase 2: (empty, no next-actions yet in store)  ← omitted

TOOL_CALL_START (render_product_carousel #2)
  → Phase 0: skeleton-surface-default (activity_id=B)

TOOL_CALL_RESULT (render_product_carousel #2)
  → Phase 1: product-surface-wetsuits (activity_id=B, replaces skeleton)
  → Phase 2: (empty, no next-actions yet in store)  ← omitted

TOOL_CALL_START (render_next_actions)
  → Phase 0: next-actions skeleton (activity_id=C)

TOOL_CALL_RESULT (render_next_actions)
  → Phase 1: (empty, no content ops)  ← omitted
  → Phase 2: next-actions-surface (activity_id=C, replaces skeleton)
```

For a bundle response where all tools fire in a single parallel LLM tool-use block:

```
TOOL_CALL_START (render_bundle_display)
  → Phase 0: bundle-display skeleton (activity_id=A)

TOOL_CALL_RESULT (last tool in the block, e.g. render_bundle_display)
  → Phase 1: bundle-surface-essential-0, ..., bundle-display-surface (activity_id=A)
  → Phase 2: next-actions-surface (activity_id=B)
```

For a comparison response (`render_comparison_table` → `render_comparison_summary` → `render_next_actions`):

```
TOOL_CALL_START (render_comparison_table)
  → Phase 0: skeleton-surface-default (activity_id=A)

TOOL_CALL_RESULT (render_comparison_table)
  → Phase 1: comparison-surface (activity_id=A, replaces skeleton)
  → Phase 2: (empty, no next-actions yet in store)  ← omitted

TOOL_CALL_START (render_comparison_summary)
  → Phase 0: skeleton-surface-default (activity_id=B)

TOOL_CALL_RESULT (render_comparison_summary)
  → Phase 1: comparison-summary-surface (activity_id=B, replaces skeleton)
  → Phase 2: (empty, no next-actions yet in store)  ← omitted

TOOL_CALL_START (render_next_actions)
  → Phase 0: next-actions skeleton (activity_id=C)

TOOL_CALL_RESULT (render_next_actions)
  → Phase 1: (empty, no content ops)  ← omitted
  → Phase 2: next-actions-surface (activity_id=C, replaces skeleton)
```

---

## 8. Surface ID Conventions

| Pattern                      | Example                      | Notes                                         |
| ---------------------------- | ---------------------------- | --------------------------------------------- |
| `product-surface`            | `product-surface`            | Single-intent (positional routing)            |
| `product-surface-<slug>`     | `product-surface-kayaks`     | Multi-intent (slug-keyed routing)             |
| `comparison-surface`         | `comparison-surface`         | Always fixed; ID-keyed routing                |
| `comparison-summary-surface` | `comparison-summary-surface` | Always fixed; no products, literalString only |
| `bundle-surface-<tier>-<N>`  | `bundle-surface-essential-0` | N = zero-based slot index                     |
| `bundle-display-surface`     | `bundle-display-surface`     | Always fixed; config-only (no products)       |
| `next-actions-surface`       | `next-actions-surface`       | Always fixed; always Phase 2 snapshot         |

Surface IDs must match `[a-zA-Z0-9_-]+`. The `root` ID is always `root-<surface_id>`.

---

## 9. `dataModelUpdate` Schema Reference

All product-carrying surfaces use this structure (produced by `build_data_model_update` in `protocol/a2ui/data_model.py`):

```json
{
  "dataModelUpdate": {
    "surfaceId": "<surface_id>",
    "contents": [
      {
        "key": "items",
        "valueMap": [
          {
            "valueMap": [
              {"key": "ec_name", "valueString": "<string>"},
              {"key": "ec_brand", "valueString": "<string>"},
              {"key": "ec_price", "valueNumber": 0.0},
              {"key": "ec_promo_price", "valueNumber": 0.0},
              {"key": "ec_image", "valueString": "<url string>"},
              {"key": "ec_product_id", "valueString": "<string>"}
            ]
          }
        ]
      }
    ]
  }
}
```

Field notes:

| Key              | Source                      | Wire type     | Always present?   |
| ---------------- | --------------------------- | ------------- | ----------------- |
| `ec_name`        | `product["ec_name"]`        | `valueString` | If not empty      |
| `ec_brand`       | `product["ec_brand"]`       | `valueString` | If not empty      |
| `ec_price`       | `product["ec_price"]`       | `valueNumber` | If not None       |
| `ec_promo_price` | `product["ec_promo_price"]` | `valueNumber` | If not None       |
| `ec_image`       | `product["ec_images"][0]`   | `valueString` | If list not empty |
| `ec_product_id`  | `product["ec_product_id"]`  | `valueString` | If not empty      |

For comparison surfaces, custom attrs (`standout`, `trade_off`, `best_for`, `key_spec`) are appended to each item's `valueMap` after the `ec_*` entries as `valueString` entries.
