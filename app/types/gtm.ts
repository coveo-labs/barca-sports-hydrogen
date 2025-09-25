/**
 * Google Tag Manager DataLayer Types
 * These interfaces define the structure for Google Analytics 4 Enhanced Ecommerce events
 */

export interface DataLayerItem {
  item_id: string;
  item_name: string;
  index?: number;
  price: number;
  quantity: number;
}

export interface EcommerceBase {
  currency?: string;
  value?: number;
  items?: DataLayerItem[];
}

export interface PurchaseEcommerce extends EcommerceBase {
  transaction_id: string;
  currency: string;
  value: number;
  items: DataLayerItem[];
}

export interface ViewItemListEcommerce extends EcommerceBase {
  item_list_id: string;
  item_list_name?: string;
  items: DataLayerItem[];
}

export interface AddToCartEcommerce extends EcommerceBase {
  currency: string;
  value: number;
  items: DataLayerItem[];
}

export interface RemoveFromCartEcommerce extends EcommerceBase {
  currency: string;
  value: number;
  items: DataLayerItem[];
}

// Base event interface
export interface BaseDataLayerEvent {
  event: string;
  [key: string]: any;
}

// Specific event interfaces
export interface SearchEvent extends BaseDataLayerEvent {
  event: 'search';
  search_type: 'search_box' | 'generative_answering';
  search_term: string;
  has_answer?: string;
}

export interface AddToCartEvent extends BaseDataLayerEvent {
  event: 'add_to_cart';
  ecommerce: AddToCartEcommerce;
}

export interface RemoveFromCartEvent extends BaseDataLayerEvent {
  event: 'remove_from_cart';
  ecommerce: RemoveFromCartEcommerce;
}

export interface ViewItemListEvent extends BaseDataLayerEvent {
  event: 'view_item_list';
  ecommerce: ViewItemListEcommerce;
}

export interface PurchaseEvent extends BaseDataLayerEvent {
  event: 'purchase';
  ecommerce: PurchaseEcommerce;
}

// Union type for all possible dataLayer events
export type DataLayerEvent =
  | SearchEvent
  | AddToCartEvent
  | RemoveFromCartEvent
  | ViewItemListEvent
  | PurchaseEvent
  | {ecommerce: null} // Used to clear previous ecommerce object
  | BaseDataLayerEvent;

// DataLayer array interface
export interface DataLayer extends Array<DataLayerEvent> {
  push(...items: DataLayerEvent[]): number;
}

// Global window interface extension
declare global {
  interface Window {
    dataLayer: DataLayer;
  }
}
