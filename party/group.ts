import type * as Party from "partykit/server";

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

interface GroupMessage {
  type: string;
  senderId: string;
  timestamp: number;
  [key: string]: unknown;
}

export default class GroupServer implements Party.Server {
  private participants: Map<string, Participant> = new Map();
  private hostId: string | null = null;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const name = url.searchParams.get("name") || "Anonymous";
    const isHost = url.searchParams.get("isHost") === "true";

    const participant: Participant = {
      id: conn.id,
      name,
      isHost,
      joinedAt: Date.now(),
    };

    // First host in the room becomes the official host
    if (isHost && !this.hostId) {
      this.hostId = conn.id;
      participant.isHost = true;
    } else if (isHost && this.hostId) {
      // Can't have multiple hosts - demote to participant
      participant.isHost = false;
    }

    this.participants.set(conn.id, participant);
    this.broadcastParticipants();
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as GroupMessage;

      switch (data.type) {
        case "state-sync":
          // Only host can broadcast state
          if (sender.id === this.hostId) {
            this.room.broadcast(message, [sender.id]);
          }
          break;

        case "control":
          // Only host can send control messages
          if (sender.id === this.hostId) {
            this.room.broadcast(message, [sender.id]);
          }
          break;

        case "join":
          // Acknowledge join by sending current participants
          this.broadcastParticipants();
          break;

        case "leave":
          // Will be handled in onClose
          break;

        case "transfer-host":
          // Only current host can transfer
          if (sender.id === this.hostId && data.newHostId) {
            const newHost = this.participants.get(data.newHostId as string);
            const oldHost = this.participants.get(sender.id);

            if (newHost && oldHost) {
              // Transfer host status
              oldHost.isHost = false;
              newHost.isHost = true;
              this.hostId = data.newHostId as string;
              this.broadcastParticipants();
            }
          }
          break;

        default:
          // Broadcast other messages to all
          this.room.broadcast(message);
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  }

  onClose(conn: Party.Connection) {
    const participant = this.participants.get(conn.id);
    this.participants.delete(conn.id);

    // If host left, assign new host to earliest participant
    if (conn.id === this.hostId) {
      this.hostId = null;

      if (this.participants.size > 0) {
        // Find earliest joined participant
        let earliest: Participant | null = null;
        for (const p of this.participants.values()) {
          if (!earliest || p.joinedAt < earliest.joinedAt) {
            earliest = p;
          }
        }

        if (earliest) {
          earliest.isHost = true;
          this.hostId = earliest.id;
        }
      }
    }

    this.broadcastParticipants();
  }

  private broadcastParticipants() {
    const participantList = Array.from(this.participants.values());

    const message: GroupMessage = {
      type: "participant-update",
      senderId: "server",
      timestamp: Date.now(),
      participants: participantList,
    };

    this.room.broadcast(JSON.stringify(message));
  }
}
