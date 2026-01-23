import type {
  PomodoroState,
  GroupParticipant,
  GroupConnectionState,
} from "../types";

export type { GroupConnectionState, GroupParticipant } from "../types";

export interface GroupSession {
  code: string;
  hostId: string;
  participants: GroupParticipant[];
  createdAt: number;
}

export type GroupMessageType =
  | "join"
  | "leave"
  | "state-sync"
  | "control"
  | "participant-update"
  | "transfer-host"
  | "error";

export interface GroupMessageBase {
  type: GroupMessageType;
  senderId: string;
  timestamp: number;
}

export interface GroupJoinMessage extends GroupMessageBase {
  type: "join";
  name: string;
  isHost: boolean;
}

export interface GroupLeaveMessage extends GroupMessageBase {
  type: "leave";
}

export interface GroupStateSyncMessage extends GroupMessageBase {
  type: "state-sync";
  state: PomodoroState;
}

export type GroupControlAction = "start" | "pause" | "reset" | "skip";

export interface GroupControlMessage extends GroupMessageBase {
  type: "control";
  action: GroupControlAction;
}

export interface GroupParticipantUpdateMessage extends GroupMessageBase {
  type: "participant-update";
  participants: GroupParticipant[];
}

export interface GroupErrorMessage extends GroupMessageBase {
  type: "error";
  message: string;
}

export interface GroupTransferHostMessage extends GroupMessageBase {
  type: "transfer-host";
  newHostId: string;
}

export type GroupMessage =
  | GroupJoinMessage
  | GroupLeaveMessage
  | GroupStateSyncMessage
  | GroupControlMessage
  | GroupParticipantUpdateMessage
  | GroupTransferHostMessage
  | GroupErrorMessage;
