import { DEFAULT_GROUP_SERVER, GROUP_CONFIG } from "./config";
import type {
  GroupMessage,
  GroupParticipant,
  GroupConnectionState,
} from "./types";

export interface GroupClientOptions {
  server?: string;
  sessionCode: string;
  participantId: string;
  participantName: string;
  isHost: boolean;
  onMessage: (message: GroupMessage) => void;
  onConnectionChange: (state: GroupConnectionState) => void;
  onParticipantsUpdate: (participants: GroupParticipant[]) => void;
}

export class GroupClient {
  private socket: WebSocket | null = null;
  private options: GroupClientOptions;
  private connectionState: GroupConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(options: GroupClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    let server = this.options.server || DEFAULT_GROUP_SERVER;

    // Strip protocol if present
    server = server.replace(/^https?:\/\//, "");

    // Build WebSocket URL for PartyKit
    // PartyKit URL format: wss://<project>.<user>.partykit.dev/party/<room>
    const wsUrl = `wss://${server}/party/${this.options.sessionCode}?_pk=${this.options.participantId}&name=${encodeURIComponent(this.options.participantName)}&isHost=${this.options.isHost}`;

    this.setConnectionState("connecting");

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState("connected");

        // Send join message
        this.send({
          type: "join",
          senderId: this.options.participantId,
          timestamp: Date.now(),
          name: this.options.participantName,
          isHost: this.options.isHost,
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as GroupMessage;
          this.options.onMessage(message);

          // Handle participant updates
          if (message.type === "participant-update") {
            this.options.onParticipantsUpdate(message.participants);
          }
        } catch (err) {
          // Ignore parse errors
        }
      };

      this.socket.onclose = () => {
        this.handleDisconnect();
      };

      this.socket.onerror = () => {
        // Error will be followed by close event
      };
    } catch (err) {
      this.setConnectionState("error");
      throw err;
    }
  }

  private handleDisconnect(): void {
    if (this.connectionState === "disconnected") return;

    if (this.reconnectAttempts < GROUP_CONFIG.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        GROUP_CONFIG.reconnectDelayBase *
        Math.pow(2, this.reconnectAttempts - 1);
      this.setConnectionState("connecting");

      this.reconnectTimer = setTimeout(() => {
        if (this.connectionState !== "disconnected") {
          this.connect().catch(() => {
            this.setConnectionState("error");
          });
        }
      }, delay);
    } else {
      this.setConnectionState("error");
    }
  }

  private setConnectionState(state: GroupConnectionState): void {
    this.connectionState = state;
    this.options.onConnectionChange(state);
  }

  send(message: GroupMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setConnectionState("disconnected");

    if (this.socket) {
      // Send leave message before disconnecting
      if (this.socket.readyState === WebSocket.OPEN) {
        this.send({
          type: "leave",
          senderId: this.options.participantId,
          timestamp: Date.now(),
        });
      }

      this.socket.close();
      this.socket = null;
    }
  }

  getConnectionState(): GroupConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === "connected";
  }
}
