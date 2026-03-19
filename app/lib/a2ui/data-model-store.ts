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
        result[key] = this.mapEntriesToValue(entry.valueMap);
      } else {
        result[key] = null;
      }
    }

    return result;
  }

  private mapEntriesToValue(entries: Array<DataModelEntry>): DataValue {
    if (this.isAnonymousList(entries)) {
      return entries.map((entry) => this.listEntryToValue(entry));
    }

    if (this.isIndexedList(entries)) {
      return [...entries]
        .sort((left, right) => Number(left.key) - Number(right.key))
        .map((entry) => this.listEntryToValue(entry));
    }

    return this.dataToValue(entries);
  }

  private listEntryToValue(entry: DataModelEntry): DataValue {
    if (entry.valueString !== undefined) {
      return entry.valueString;
    }
    if (entry.valueNumber !== undefined) {
      return entry.valueNumber;
    }
    if (entry.valueBoolean !== undefined) {
      return entry.valueBoolean;
    }
    if (entry.valueMap !== undefined) {
      return this.mapEntriesToValue(entry.valueMap);
    }
    return null;
  }

  private isAnonymousList(entries: Array<DataModelEntry>): boolean {
    return (
      entries.length > 0 &&
      entries.every(
        (entry) => entry.key === undefined && entry.valueMap !== undefined,
      )
    );
  }

  private isIndexedList(entries: Array<DataModelEntry>): boolean {
    return (
      entries.length > 0 &&
      entries.every(
        (entry) =>
          typeof entry.key === 'string' &&
          /^\d+$/.test(entry.key) &&
          (entry.valueString !== undefined ||
            entry.valueNumber !== undefined ||
            entry.valueBoolean !== undefined ||
            entry.valueMap !== undefined),
      )
    );
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
