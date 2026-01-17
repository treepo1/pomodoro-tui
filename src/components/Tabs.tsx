import React from "react";
import { Box, Text } from "ink";

export type ActiveTab = "timer" | "stats" | "group";
export const TABS: ActiveTab[] = ["timer", "stats", "group"];

interface TabsProps {
  activeTab: ActiveTab;
}

export function Tabs({ activeTab }: TabsProps) {
  return (
    <Box marginBottom={1}>
      <Text
        bold={activeTab === "timer"}
        color={activeTab === "timer" ? "yellow" : "gray"}
      >
        [ Timer ]
      </Text>
      <Text> </Text>
      <Text
        bold={activeTab === "stats"}
        color={activeTab === "stats" ? "yellow" : "gray"}
      >
        [ Stats ]
      </Text>
      <Text> </Text>
      <Text
        bold={activeTab === "group"}
        color={activeTab === "group" ? "yellow" : "gray"}
      >
        [ Group ]
      </Text>
      <Text color="gray" dimColor>
        {"  "}(Tab/Arrows)
      </Text>
    </Box>
  );
}
