// PartyKit server configuration
export const DEFAULT_GROUP_SERVER = "https://pomodoro-jam.treepo1.partykit.dev";

export const GROUP_CONFIG = {
  // State sync interval in milliseconds (host broadcasts state)
  stateSyncInterval: 1000,

  // Connection timeout in milliseconds
  connectionTimeout: 10000,

  // Reconnection attempts
  maxReconnectAttempts: 5,

  // Reconnection delay base (exponential backoff)
  reconnectDelayBase: 1000,
};
