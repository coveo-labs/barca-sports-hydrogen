/**
 * Data Model Store
 * Manages application state for A2UI surfaces using JSON Pointer paths
 */

type DataValue =
  | string
  | number
  | boolean
  | Array<DataValue>
  | {[key: string]: DataValue}
  | null;

type DataModelEntry = {
  key?: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueMap?: Array<DataModelEntry>;
};

export class DataModelStore {
  private data: Record<string, DataValue> = {};

  /**
   * Get value at JSON Pointer path
   * @param path - JSON Pointer path (e.g., "/user/name" or "/items/0")
   */
  get(path?: string): DataValue {
    if (!path || path === '/') {
      return this.data;
    }

    const segments = this.parsePointer(path);
    let current: DataValue = this.data;

    for (const segment of segments) {
      if (current === null || typeof current !== 'object') {
        return null;
      }

      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (isNaN(index) || index < 0 || index >= current.length) {
          return null;
        }
        current = current[index];
      } else {
        current = current[segment as string];
      }

      if (current === undefined) {
        return null;
      }
    }

    return current;
  }

  /**
   * Update data model with new contents structure
   * @param contents - Array of data entries to merge into root model
   */
  update(contents: Array<DataModelEntry>): void {
    const value = this.dataToValue(contents);
    // Merge into existing data
    this.data = {...this.data, ...value};
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data = {};
  }

  /**
   * Directly set all data (used for deserialization — bypasses entry parsing)
   */
  setAll(data: Record<string, DataValue>): void {
    this.data = data;
  }

  /**
   * Get entire data model
   */
  getAll(): Record<string, DataValue> {
    return this.data;
  }

  /**
   * Convert data entries to nested value structure
   */
  private dataToValue(
    entries: Array<DataModelEntry>,
  ): Record<string, DataValue> {
    const result: Record<string, DataValue> = {};

    for (const entry of entries) {
      const {key} = entry;
      // Skip anonymous entries (no key) — these are list items handled via
      // the isList branch of the parent entry's valueMap processing.
      if (key === undefined) continue;

      if (entry.valueString !== undefined) {
        result[key] = entry.valueString;
      } else if (entry.valueNumber !== undefined) {
        result[key] = entry.valueNumber;
      } else if (entry.valueBoolean !== undefined) {
        result[key] = entry.valueBoolean;
      } else if (entry.valueMap !== undefined) {
        // valueMap can represent either a nested object (all entries have keys)
        // or an array of homogeneous items (entries lack top-level keys and
        // contain nested valueMap themselves — the spec-compliant list format).
        const firstEntry = entry.valueMap[0];
        const isList =
          firstEntry !== undefined &&
          firstEntry.key === undefined &&
          firstEntry.valueMap !== undefined;

        if (isList) {
          // Array of objects: each element is an anonymous { valueMap: [...] }
          result[key] = entry.valueMap.map((item) =>
            this.dataToValue(item.valueMap!),
          );
        } else {
          // Nested object: keyed entries
          result[key] = this.dataToValue(entry.valueMap);
        }
      } else {
        result[key] = null;
      }
    }

    return result;
  }

  /**
   * Parse JSON Pointer path into segments
   * @param path - JSON Pointer path (e.g., "/user/name")
   */
  private parsePointer(path: string): string[] {
    if (path === '/') {
      return [];
    }

    return path
      .split('/')
      .slice(1) // Remove leading empty string
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  }
}
