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
  key: string;
  value?: DataValue;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueMap?: Array<DataModelEntry>;
  valueList?: Array<DataModelEntry | DataValue>;
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
   * Update data model with new data structure
   * @param data - Array of data entries to merge into root model
   */
  update(data: Array<DataModelEntry>): void {
    const value = this.dataToValue(data);
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
   * Get entire data model
   */
  getAll(): Record<string, DataValue> {
    return this.data;
  }

  /**
   * Convert data entries to nested value structure
   */
  private dataToValue(data: Array<DataModelEntry>): Record<string, DataValue> {
    const result: Record<string, DataValue> = {};

    for (const entry of data) {
      const {key} = entry;

      if (entry.value !== undefined) {
        result[key] = entry.value as DataValue;
      } else if (entry.valueString !== undefined) {
        result[key] = entry.valueString;
      } else if (entry.valueNumber !== undefined) {
        result[key] = entry.valueNumber;
      } else if (entry.valueBoolean !== undefined) {
        result[key] = entry.valueBoolean;
      } else if (entry.valueList !== undefined) {
        result[key] = entry.valueList.map((item) => {
          if (typeof item === 'object' && item !== null && 'valueMap' in item) {
            return this.dataToValue((item as DataModelEntry).valueMap!);
          }
          return item as DataValue;
        });
      } else if (entry.valueMap !== undefined) {
        result[key] = this.dataToValue(entry.valueMap);
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
