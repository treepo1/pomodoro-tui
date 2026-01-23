import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";

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
  const { width } = useTerminalDimensions();

  // Use shorter labels on narrow terminals
  const isCompact = width < 80;

  const fullControls = canControl
    ? "[S]tart [P]ause [R]eset [N]ext [Q]uit"
    : "[Q]uit";

  const musicControls = `[M]usic [>]station [+/-] Volume [Shift+P] Pet [${petId}]`;

  if (isCompact) {
    return <></>;
  }

  return (
    <>
      <box marginTop={1}>
        <text fg="yellow">{fullControls}</text>
      </box>
      <box marginTop={1}>
        <text fg="magenta">{musicControls}</text>
      </box>
      {isCurrentHost && showTransferHint && (
        <box>
          <text fg="yellow" attributes={TextAttributes.DIM}>
            [1-9] transfer host
          </text>
        </box>
      )}
    </>
  );
}
