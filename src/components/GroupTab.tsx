import React from "react";
import { Box, Text } from "ink";
import type { JamParticipant, JamConnectionState } from "../types";
import { getConnectionDisplay } from "../utils";

interface GroupTabProps {
  isJamMode: boolean;
  isCurrentHost: boolean;
  jamSessionCode: string;
  jamConnectionState: JamConnectionState;
  jamParticipants: JamParticipant[];
  jamManagerId?: string;
  userName: string;
  editNameMode: boolean;
  nameInput: string;
  joinMode: boolean;
  joinCodeInput: string;
}

export function GroupTab({
  isJamMode,
  isCurrentHost,
  jamSessionCode,
  jamConnectionState,
  jamParticipants,
  jamManagerId,
  userName,
  editNameMode,
  nameInput,
  joinMode,
  joinCodeInput,
}: GroupTabProps) {
  const connDisplay = getConnectionDisplay(jamConnectionState);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text bold color="cyan">GROUP SESSION</Text>

      {isJamMode ? (
        <Box marginY={2} flexDirection="column" alignItems="center">
          <Text color="white">Session Code:</Text>
          <Box marginY={1}>
            <Text bold color="yellow" backgroundColor="gray">
              {"  "}{jamSessionCode}{"  "}
            </Text>
          </Box>
          <Text color="gray" dimColor>Share this code with friends</Text>

          <Box marginY={1} flexDirection="column" alignItems="center">
            <Text color={connDisplay.color as any}>
              {connDisplay.symbol} {connDisplay.text}
            </Text>
          </Box>

          {jamParticipants.length > 0 && (
            <Box marginY={1} flexDirection="column" alignItems="center">
              <Text color="white">Participants ({jamParticipants.length}):</Text>
              {jamParticipants.map((p) => {
                const isMe = p.id === jamManagerId;
                return (
                  <Text key={p.id} color={isMe ? "cyan" : "gray"}>
                    {p.isHost ? "* " : "- "}{p.name}
                    {p.isHost ? " (host)" : ""}
                    {isMe ? " (you)" : ""}
                  </Text>
                );
              })}
            </Box>
          )}

          {isCurrentHost && (
            <Box marginY={1}>
              <Text color="gray">Command: pomotui --join {jamSessionCode}</Text>
            </Box>
          )}
        </Box>
      ) : editNameMode ? (
        <Box marginY={2} flexDirection="column" alignItems="center">
          <Text color="white">Enter your name:</Text>
          <Box marginY={1}>
            <Text backgroundColor="gray" color="white">
              {"  "}{nameInput || "_"}{"  "}
            </Text>
          </Box>
          <Box marginY={1} />
          <Text color="gray" dimColor>Press Enter to save, Esc to cancel</Text>
        </Box>
      ) : joinMode ? (
        <Box marginY={2} flexDirection="column" alignItems="center">
          <Text color="white">Enter session code:</Text>
          <Box marginY={1}>
            <Text backgroundColor="gray" color="white">
              {"  "}{joinCodeInput.padEnd(6, "_")}{"  "}
            </Text>
          </Box>
          <Box marginY={1} />
          <Text color="gray" dimColor>Press Enter to join, Esc to cancel</Text>
        </Box>
      ) : (
        <Box marginY={2} flexDirection="column" alignItems="center">
          <Text color="gray">No active group session</Text>
          <Box marginY={2} />
          <Box marginBottom={1}>
            <Text color="gray">Your name: </Text>
            <Text color="cyan" bold>{userName}</Text>
          </Box>
          <Box marginY={1} />
          <Text color="white">[H] Host  [J] Join  [E] Edit name</Text>
        </Box>
      )}
    </Box>
  );
}
