/**
 * Data Binding Resolver
 * Resolves BoundValue objects to actual values from the data model
 */

import type {DataModelStore} from './data-model-store';

type BoundValue =
  | {path: string; literalString?: string}
  | {path: string; literalNumber?: number}
  | {path: string; literalBoolean?: boolean}
  | {literalString: string}
  | {literalNumber: number}
  | {literalBoolean: boolean};

/**
 * Resolve a BoundValue to its actual value
 * @param boundValue - The BoundValue object from component properties
 * @param dataModel - The data model store for the surface
 * @returns The resolved value (string, number, boolean, or complex object)
 */
export function resolveBoundValue(
  boundValue: unknown,
  dataModel: DataModelStore,
): unknown {
  if (!boundValue || typeof boundValue !== 'object') {
    return boundValue;
  }

  const binding = boundValue as Record<string, unknown>;

  // If both path and literal exist, update data model first, then bind to path
  if ('path' in binding && typeof binding.path === 'string') {
    const path = binding.path;

    // Check for literal values to write to the model
    if ('literalString' in binding) {
      dataModel.update([
        {
          key: path.split('/').pop() || '',
          valueString: String(binding.literalString),
        },
      ]);
    } else if ('literalNumber' in binding) {
      dataModel.update([
        {
          key: path.split('/').pop() || '',
          valueNumber: Number(binding.literalNumber),
        },
      ]);
    } else if ('literalBoolean' in binding) {
      dataModel.update([
        {
          key: path.split('/').pop() || '',
          valueBoolean: Boolean(binding.literalBoolean),
        },
      ]);
    }

    // Return the value from the data model
    return dataModel.get(path);
  }

  // Only literal value, no binding
  if ('literalString' in binding) {
    return binding.literalString;
  }
  if ('literalNumber' in binding) {
    return binding.literalNumber;
  }
  if ('literalBoolean' in binding) {
    return binding.literalBoolean;
  }

  // Not a BoundValue, return as-is
  return boundValue;
}

/**
 * Resolve all BoundValue properties in a component
 * @param component - The component object with potential BoundValue properties
 * @param dataModel - The data model store for the surface
 * @returns Component with all BoundValues resolved
 */
export function resolveComponentBindings(
  component: Record<string, unknown>,
  dataModel: DataModelStore,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(component)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this is a BoundValue
      const obj = value as Record<string, unknown>;
      if (isBoundValueObject(obj)) {
        resolved[key] = resolveBoundValue(value, dataModel);
      } else {
        // Recursively resolve nested objects
        resolved[key] = resolveComponentBindings(obj, dataModel);
      }
    } else if (Array.isArray(value)) {
      // Resolve array items
      resolved[key] = value.map((item) =>
        resolveArrayItem(item, dataModel),
      );
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Resolve a data binding path for template rendering
 * @param path - JSON Pointer path to list data
 * @param dataModel - The data model store
 * @returns Array of data items for template rendering
 */
export function resolveTemplateData(
  path: string,
  dataModel: DataModelStore,
): unknown[] {
  const value = dataModel.get(path);

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function resolveArrayItem(item: unknown, dataModel: DataModelStore): unknown {
  if (!item || typeof item !== 'object') {
    return item;
  }

  if (Array.isArray(item)) {
    return item.map((entry) => resolveArrayItem(entry, dataModel));
  }

  const record = item as Record<string, unknown>;
  return isBoundValueObject(record)
    ? resolveBoundValue(record, dataModel)
    : resolveComponentBindings(record, dataModel);
}

function isBoundValueObject(value: Record<string, unknown>): value is BoundValue {
  return (
    'path' in value ||
    'literalString' in value ||
    'literalNumber' in value ||
    'literalBoolean' in value
  );
}
