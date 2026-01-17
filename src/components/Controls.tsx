import React from "react";
import { Box, Text } from "ink";

interface ControlsProps {
  canControl: boolean;
  isCurrentHost: boolean;
  showTransferHint: boolean;
}

export function Controls({ canControl, isCurrentHost, showTransferHint }: ControlsProps) {
  return (
    <>
      <Box marginTop={1}>
        <Text color="yellow">
          {canControl
            ? `[S]tart [P]ause [R]eset [N]ext [Q]uit [M]usic [>]station`
            : `[Q]uit [M]usic [>]station`}
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
