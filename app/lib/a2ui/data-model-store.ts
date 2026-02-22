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

    console.log('[dataToValue] Processing entries:', data);

    for (const entry of data) {
      const {key} = entry;

      if (entry.value !== undefined) {
        // Direct value (any type)
        console.log('[dataToValue] Setting direct value:', key, entry.value);
        result[key] = entry.value as DataValue;
      } else if (entry.valueString !== undefined) {
        console.log('[dataToValue] Setting string:', key, entry.valueString);
        result[key] = entry.valueString;
      } else if (entry.valueNumber !== undefined) {
        console.log('[dataToValue] Setting number:', key, entry.valueNumber);
        result[key] = entry.valueNumber;
      } else if (entry.valueBoolean !== undefined) {
        console.log('[dataToValue] Setting boolean:', key, entry.valueBoolean);
        result[key] = entry.valueBoolean;
      } else if (entry.valueList !== undefined) {
        // Array of items - each item can be a valueMap object or direct value
        console.log(
          '[dataToValue] Processing valueList:',
          key,
          entry.valueList,
        );
        result[key] = entry.valueList.map((item, idx) => {
          if (typeof item === 'object' && item !== null && 'valueMap' in item) {
            console.log(
              '[dataToValue] Item',
              idx,
              'has valueMap:',
              (item as any).valueMap,
            );
            const converted = this.dataToValue(
              (item as DataModelEntry).valueMap!,
            );
            console.log('[dataToValue] Converted item', idx, ':', converted);
            return converted;
          }
          console.log('[dataToValue] Item', idx, 'is direct value:', item);
          return item as DataValue;
        });
      } else if (entry.valueMap !== undefined) {
        // Nested object
        console.log('[dataToValue] Processing valueMap:', key, entry.valueMap);
        result[key] = this.dataToValue(entry.valueMap);
      } else {
        result[key] = null;
      }
    }

    console.log('[dataToValue] Result:', result);
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

  /**
   * Ensure path exists, creating objects/arrays as needed
   */
  private ensurePath(segments: string[]): DataValue {
    let current: DataValue = this.data;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      if (typeof current !== 'object' || current === null) {
        throw new Error(`Cannot traverse non-object at segment ${segment}`);
      }

      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (isNaN(index)) {
          throw new Error(`Invalid array index: ${segment}`);
        }

        // Extend array if needed
        while (current.length <= index) {
          current.push(null);
        }

        if (current[index] === null || current[index] === undefined) {
          // Determine if next level should be array or object
          const isNextArray = nextSegment && !isNaN(parseInt(nextSegment, 10));
          current[index] = isNextArray ? [] : {};
        }

        current = current[index];
      } else {
        const obj = current as Record<string, DataValue>;

        if (!(segment in obj) || obj[segment] === null) {
          // Determine if next level should be array or object
          const isNextArray = nextSegment && !isNaN(parseInt(nextSegment, 10));
          obj[segment] = isNextArray ? [] : {};
        }

        current = obj[segment];
      }
    }

    return current;
  }
}
