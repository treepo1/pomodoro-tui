import { TextAttributes, type MouseEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useState } from "react";

export type ActiveTab = "timer" | "projects" | "stats" | "group";
export const TABS: ActiveTab[] = ["timer", "projects", "stats", "group"];

interface TabsProps {
  activeTab: ActiveTab;
  onTabClick?: (tab: ActiveTab) => void;
}

// Individual tab button component with hover effect
function TabButton({
  tab,
  label,
  isActive,
  onClick,
}: {
  tab: ActiveTab;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const color = isActive ? "yellow" : isHovered ? "cyan" : "gray";
  const attrs = isActive || isHovered ? TextAttributes.BOLD : undefined;

  return (
    <box
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onMouseUp={
        onClick
          ? (e: MouseEvent) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <text attributes={attrs} fg={color}>
        [ {label} ]
      </text>
    </box>
  );
}

export function Tabs({ activeTab, onTabClick }: TabsProps) {
  const { width } = useTerminalDimensions();

  // Use shorter labels and hide hint on narrow terminals
  const isCompact = width < 60;
  const isVeryCompact = width < 45;

  // Tab labels based on available width
  const tabLabels: Record<ActiveTab, string> = {
    timer: isVeryCompact ? "Tmr" : "Timer",
    projects: isVeryCompact ? "Prj" : "Projects",
    stats: isVeryCompact ? "Sts" : "Stats",
    group: isVeryCompact ? "Grp" : "Group",
  };

  return (
    <box marginBottom={1} flexDirection="row">
      <TabButton
        tab="timer"
        label={tabLabels.timer}
        isActive={activeTab === "timer"}
        onClick={() => onTabClick?.("timer")}
      />
      <text> </text>
      <TabButton
        tab="projects"
        label={tabLabels.projects}
        isActive={activeTab === "projects"}
        onClick={() => onTabClick?.("projects")}
      />
      <text> </text>
      <TabButton
        tab="stats"
        label={tabLabels.stats}
        isActive={activeTab === "stats"}
        onClick={() => onTabClick?.("stats")}
      />
      <text> </text>
      <TabButton
        tab="group"
        label={tabLabels.group}
        isActive={activeTab === "group"}
        onClick={() => onTabClick?.("group")}
      />
      {!isCompact && (
        <text fg="gray" attributes={TextAttributes.DIM}>
          {"  "}(Tab/Arrows)
        </text>
      )}
    </box>
  );
}
