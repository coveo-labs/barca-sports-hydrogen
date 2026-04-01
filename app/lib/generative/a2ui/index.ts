/**
 * A2UI Library Exports
 */

export {A2UIMessageProcessor} from './message-processor';
export {SurfaceManager} from './surface-manager';
export {DataModelStore} from './data-model-store';
export {
  resolveBoundValue,
  resolveComponentBindings,
  resolveTemplateData,
} from './data-binding-resolver';

export type {A2UIEventHandler} from './message-processor';
export type {SurfaceState, ComponentDefinition} from './surface-manager';
