import { TextAttributes } from "@opentui/core";
import type { GroupConnectionState, GroupParticipant } from "../types";
import { getConnectionDisplay } from "../utils";

interface GroupTabProps {
  isGroupMode: boolean;
  isCurrentHost: boolean;
  groupSessionCode: string;
  groupConnectionState: GroupConnectionState;
  groupParticipants: GroupParticipant[];
  groupManagerId?: string;
  userName: string;
  editNameMode: boolean;
  nameInput: string;
  joinMode: boolean;
  joinCodeInput: string;
}

export function GroupTab({
  isGroupMode,
  isCurrentHost,
  groupSessionCode,
  groupConnectionState,
  groupParticipants,
  groupManagerId,
  userName,
  editNameMode,
  nameInput,
  joinMode,
  joinCodeInput,
}: GroupTabProps) {
  const connDisplay = getConnectionDisplay(groupConnectionState);

  return (
    <box
      flexDirection="column"
      alignItems="center"
      paddingTop={1}
      paddingBottom={1}
    >
      <text attributes={TextAttributes.BOLD} fg="cyan">
        GROUP SESSION
      </text>

      {isGroupMode ? (
        <box
          marginTop={2}
          marginBottom={2}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="white">Session Code:</text>
          <box marginTop={1} marginBottom={1}>
            <text attributes={TextAttributes.BOLD} fg="yellow" bg="gray">
              {"  "}
              {groupSessionCode}
              {"  "}
            </text>
          </box>
          <text fg="gray" attributes={TextAttributes.DIM}>
            Share this code with friends
          </text>

          <box
            marginTop={1}
            marginBottom={1}
            flexDirection="column"
            alignItems="center"
          >
            <text fg={connDisplay.color}>
              {connDisplay.symbol} {connDisplay.text}
            </text>
          </box>

          {groupParticipants.length > 0 && (
            <box
              marginTop={1}
              marginBottom={1}
              flexDirection="column"
              alignItems="center"
            >
              <text fg="white">Participants ({groupParticipants.length}):</text>
              {groupParticipants.map((p) => {
                const isMe = p.id === groupManagerId;
                return (
                  <text key={p.id} fg={isMe ? "cyan" : "gray"}>
                    {p.isHost ? "* " : "- "}
                    {p.name}
                    {p.isHost ? " (host)" : ""}
                    {isMe ? " (you)" : ""}
                  </text>
                );
              })}
            </box>
          )}

          {isCurrentHost && (
            <box marginTop={1} marginBottom={1}>
              <text fg="gray">Command: pomotui --join {groupSessionCode}</text>
            </box>
          )}

          <box marginTop={1} marginBottom={1}>
            <text fg="white">
              [L] {isCurrentHost ? "Stop hosting" : "Leave session"}
            </text>
          </box>
        </box>
      ) : editNameMode ? (
        <box
          marginTop={2}
          marginBottom={2}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="white">Enter your name:</text>
          <box marginTop={1} marginBottom={1}>
            <text bg="gray" fg="white">
              {"  "}
              {nameInput || "_"}
              {"  "}
            </text>
          </box>
          <box marginTop={1} marginBottom={1} />
          <text fg="gray" attributes={TextAttributes.DIM}>
            Press Enter to save, Esc to cancel
          </text>
        </box>
      ) : joinMode ? (
        <box
          marginTop={2}
          marginBottom={2}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="white">Enter session code:</text>
          <box marginTop={1} marginBottom={1}>
            <text bg="gray" fg="white">
              {"  "}
              {joinCodeInput.padEnd(6, "_")}
              {"  "}
            </text>
          </box>
          <box marginTop={1} marginBottom={1} />
          <text fg="gray" attributes={TextAttributes.DIM}>
            Press Enter to join, Esc to cancel
          </text>
        </box>
      ) : (
        <box
          marginTop={2}
          marginBottom={2}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="gray">No active group session</text>
          <box marginTop={2} marginBottom={2} />
          <box marginBottom={1} flexDirection="row">
            <text fg="gray">Your name: </text>
            <text fg="cyan" attributes={TextAttributes.BOLD}>
              {userName}
            </text>
          </box>
          <box marginTop={1} marginBottom={1} />
          <text fg="white">[H] Host [J] Join [E] Edit name</text>
        </box>
      )}
    </box>
  );
}
