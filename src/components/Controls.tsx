import React from "react";
import { Box, Text } from "ink";

interface ControlsProps {
  canControl: boolean;
  isCurrentHost: boolean;
  showTransferHint: boolean;
  petId: string;
}

export function Controls({
  canControl,
  isCurrentHost,
  showTransferHint,
  petId,
}: ControlsProps) {
  return (
    <>
      <Box marginTop={1}>
        <Text color="yellow">
          {canControl ? `[S]tart [P]ause [R]eset [N]ext [Q]uit ` : `[Q]uit`}
        </Text>
      </Box>
      <Box>
        <Text color="magenta">
          {`[M]usic [>]station [+/-] Volume [Shift+P] Pet [${petId}]`}
        </Text>
      </Box>
      {isCurrentHost && showTransferHint && (
        <Box>
          <Text color="yellow" dimColor>
            [1-9] transfer host
          </Text>
        </Box>
      )}
    </>
  );
}
