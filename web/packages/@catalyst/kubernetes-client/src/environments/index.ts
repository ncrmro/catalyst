/**
 * Environment CR client exports
 */

export { createEnvironmentClient, EnvironmentClient } from "./client";
export {
  ClusterEnvironmentWatcher,
  EnvironmentWatcher,
  type EnvironmentWatchHandler,
  type EnvironmentWatchOptions,
  type WatchConnectHandler,
  type WatchErrorHandler,
} from "./watcher";
