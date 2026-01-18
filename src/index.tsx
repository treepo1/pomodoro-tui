import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { Pomodoro } from "./pomodoro";
import { HistoryManager } from "./history";
import { MusicManager } from "./music";
import { JamManager, validateSessionCode, normalizeSessionCode } from "./jam";
import type { PomodoroState, JamParticipant, JamConnectionState } from "./types";
import { checkForUpdates } from "./updater";
import { parseConfig } from "./cli";
import { getSessionDuration, notifyUser } from "./utils";
import {
  Tabs,
  TABS,
  type ActiveTab,
  TimerTab,
  StatsTab,
  GroupTab,
  Controls,
} from "./components";
import { TaskManager, type Task } from "./tasks";
import { SettingsManager } from "./settings";

interface PomodoroTUIProps {
  config: ReturnType<typeof parseConfig> & {};
}

function PomodoroTUI({ config }: PomodoroTUIProps) {
  const { exit } = useApp();
  const [pomodoro] = useState(() => new Pomodoro(config.pomodoro));
  const [history] = useState(() => new HistoryManager(config.historyFile));
  const [music] = useState(() => new MusicManager(config.musicMode));
  const [state, setState] = useState<PomodoroState>(pomodoro.getState());
  const [todayStats, setTodayStats] = useState(history.getTodayStats());
  const [musicStatus, setMusicStatus] = useState(music.getStatusText());
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("timer");
  const [joinMode, setJoinMode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [editNameMode, setEditNameMode] = useState(false);
  const [settingsManager] = useState(() => new SettingsManager());
  const [userName, setUserNameState] = useState(() =>
    config.jam.participantName || settingsManager.getUserName()
  );
  const [nameInput, setNameInput] = useState("");

  const setUserName = (name: string) => {
    setUserNameState(name);
    settingsManager.setUserName(name);
  };

  // Task tracker state
  const [taskManager] = useState(() => new TaskManager());
  const [tasks, setTasks] = useState<Task[]>(() => taskManager.getTasks());
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [addTaskMode, setAddTaskMode] = useState(false);
  const [taskInput, setTaskInput] = useState("");

  // Jam session state
  const [jamManager, setJamManager] = useState<JamManager | null>(null);
  const [jamParticipants, setJamParticipants] = useState<JamParticipant[]>([]);
  const [jamConnectionState, setJamConnectionState] =
    useState<JamConnectionState>("disconnected");
  const [jamSessionCode, setJamSessionCode] = useState<string>("");
  const [isCurrentHost, setIsCurrentHost] = useState<boolean>(config.jam.isHost);

  // Refs for stale closure avoidance
  const jamManagerRef = useRef<JamManager | null>(null);
  const jamParticipantsRef = useRef<JamParticipant[]>([]);
  const isCurrentHostRef = useRef<boolean>(config.jam.isHost);

  useEffect(() => { jamManagerRef.current = jamManager; }, [jamManager]);
  useEffect(() => { jamParticipantsRef.current = jamParticipants; }, [jamParticipants]);
  useEffect(() => { isCurrentHostRef.current = isCurrentHost; }, [isCurrentHost]);

  const isJamMode = jamManager !== null;
  const canControl = !isJamMode || isCurrentHost;

  const startHosting = () => {
    if (jamManager) return;
    const manager = new JamManager({
      pomodoro,
      isHost: true,
      participantName: userName,
      server: config.jam.server,
      onStateChange: () => setState(pomodoro.getState()),
      onParticipantsChange: (participants) => setJamParticipants(participants),
      onConnectionChange: (connState) => setJamConnectionState(connState),
      onHostChange: (isHost) => setIsCurrentHost(isHost),
    });
    setJamManager(manager);
    jamManagerRef.current = manager;
    setJamSessionCode(manager.getSessionCode());
    setIsCurrentHost(true);
    isCurrentHostRef.current = true;
    manager.connect().catch(() => {});
  };

  const joinSession = (code: string) => {
    if (jamManager) return;
    const normalizedCode = normalizeSessionCode(code);
    if (!validateSessionCode(normalizedCode)) return;
    const manager = new JamManager({
      pomodoro,
      isHost: false,
      sessionCode: normalizedCode,
      participantName: userName,
      server: config.jam.server,
      onStateChange: () => setState(pomodoro.getState()),
      onParticipantsChange: (participants) => setJamParticipants(participants),
      onConnectionChange: (connState) => setJamConnectionState(connState),
      onHostChange: (isHost) => setIsCurrentHost(isHost),
    });
    setJamManager(manager);
    jamManagerRef.current = manager;
    setJamSessionCode(manager.getSessionCode());
    setIsCurrentHost(false);
    isCurrentHostRef.current = false;
    manager.connect().catch(() => {});
  };

  // Version check on startup
  useEffect(() => {
    checkForUpdates()
      .then((result) => {
        if (result.updateAvailable) setUpdateAvailable(result.latestVersion);
      })
      .catch(() => {});
  }, []);

  // Initialize pomodoro and jam session
  useEffect(() => {
    pomodoro.setOnTick((newState) => setState(newState));

    pomodoro.setOnSessionComplete(async (session) => {
      const sessionDuration = getSessionDuration(session, config.pomodoro);
      await history.addEntry(session, sessionDuration);
      setTodayStats(history.getTodayStats());
      const nextState = pomodoro.getState();
      notifyUser();
    });

    if (config.jam.enabled) {
      const manager = new JamManager({
        pomodoro,
        isHost: config.jam.isHost,
        sessionCode: config.jam.sessionCode,
        participantName: config.jam.participantName,
        server: config.jam.server,
        onStateChange: () => setState(pomodoro.getState()),
        onParticipantsChange: (participants) => setJamParticipants(participants),
        onConnectionChange: (connState) => setJamConnectionState(connState),
        onHostChange: (isHost) => setIsCurrentHost(isHost),
      });
      setJamManager(manager);
      setJamSessionCode(manager.getSessionCode());
      manager.connect().catch(() => {});
    }

    return () => {
      music.cleanup();
      jamManager?.disconnect();
    };
  }, []);

  // Input handling
  useInput((input, key) => {
    // Add task mode
    if (addTaskMode) {
      if (key.escape) { setAddTaskMode(false); setTaskInput(""); return; }
      if (key.return) {
        if (taskInput.trim().length > 0) {
          taskManager.add(taskInput.trim());
          setTasks(taskManager.getTasks());
        }
        setAddTaskMode(false); setTaskInput(""); return;
      }
      if (key.backspace || key.delete) { setTaskInput((p) => p.slice(0, -1)); return; }
      if (input && input.length > 0) setTaskInput((p) => p + input);
      return;
    }

    // Name edit mode
    if (editNameMode) {
      if (key.escape) { setEditNameMode(false); setNameInput(""); return; }
      if (key.return) {
        if (nameInput.trim().length > 0) setUserName(nameInput.trim());
        setEditNameMode(false); setNameInput(""); return;
      }
      if (key.backspace || key.delete) { setNameInput((p) => p.slice(0, -1)); return; }
      if (input && input.length > 0) setNameInput((p) => (p + input).slice(0, 20));
      return;
    }

    // Join mode
    if (joinMode) {
      if (key.escape) { setJoinMode(false); setJoinCodeInput(""); return; }
      if (key.return) {
        if (joinCodeInput.length >= 6) {
          joinSession(joinCodeInput);
          setJoinMode(false); setJoinCodeInput("");
        }
        return;
      }
      if (key.backspace || key.delete) { setJoinCodeInput((p) => p.slice(0, -1)); return; }
      if (input && input.length > 0) {
        const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (cleaned.length > 0) setJoinCodeInput((p) => (p + cleaned).slice(0, 6));
      }
      return;
    }

    // Task navigation with Up/Down arrows (Timer tab only)
    if (key.upArrow && activeTab === "timer") {
      const allTasks = [...taskManager.getPending(), ...taskManager.getCompleted()];
      if (allTasks.length > 0) {
        setSelectedTaskIndex((p) => (p - 1 + allTasks.length) % allTasks.length);
      }
      return;
    }
    if (key.downArrow && activeTab === "timer") {
      const allTasks = [...taskManager.getPending(), ...taskManager.getCompleted()];
      if (allTasks.length > 0) {
        setSelectedTaskIndex((p) => (p + 1) % allTasks.length);
      }
      return;
    }

    // Toggle task with Space (Timer tab only)
    if (input === " " && activeTab === "timer") {
      const allTasks = [...taskManager.getPending(), ...taskManager.getCompleted()];
      if (allTasks[selectedTaskIndex]) {
        taskManager.toggle(allTasks[selectedTaskIndex].id);
        setTasks(taskManager.getTasks());
        // Adjust selection if needed
        const newAllTasks = [...taskManager.getPending(), ...taskManager.getCompleted()];
        if (selectedTaskIndex >= newAllTasks.length) {
          setSelectedTaskIndex(Math.max(0, newAllTasks.length - 1));
        }
      }
      return;
    }

    // Add task mode with 'a' (Timer tab only)
    if (input === "a" && activeTab === "timer") {
      setAddTaskMode(true);
      setTaskInput("");
      return;
    }

    // Delete task with 'd' (Timer tab only)
    if (input === "d" && activeTab === "timer") {
      const allTasks = [...taskManager.getPending(), ...taskManager.getCompleted()];
      if (allTasks[selectedTaskIndex]) {
        taskManager.delete(allTasks[selectedTaskIndex].id);
        setTasks(taskManager.getTasks());
        const newAllTasks = [...taskManager.getPending(), ...taskManager.getCompleted()];
        if (selectedTaskIndex >= newAllTasks.length) {
          setSelectedTaskIndex(Math.max(0, newAllTasks.length - 1));
        }
      }
      return;
    }

    // Tab switching with Tab and Left/Right arrows
    if (key.tab || key.rightArrow) {
      setActiveTab((p) => TABS[(TABS.indexOf(p) + 1) % TABS.length]);
      return;
    }
    if (key.leftArrow) {
      setActiveTab((p) => TABS[(TABS.indexOf(p) - 1 + TABS.length) % TABS.length]);
      return;
    }

    // Global controls
    if (input === "q" || key.escape || (key.ctrl && input === "c")) {
      music.cleanup();
      jamManager?.disconnect();
      console.log(`\nGoodbye! You completed ${state.completedPomodoros} pomodoros.`);
      exit();
    } else if (input === "s" && canControl) {
      pomodoro.start();
      jamManager?.sendControl("start");
    } else if (input === "p" && canControl) {
      pomodoro.pause();
      jamManager?.sendControl("pause");
    } else if (input === "r" && canControl) {
      pomodoro.reset();
      jamManager?.sendControl("reset");
    } else if (input === "n" && canControl) {
      pomodoro.skip();
      jamManager?.sendControl("skip");
    } else if (input === "m") {
      music.toggle();
      setMusicStatus(music.getStatusText());
    } else if (input === ">" || input === ".") {
      music.nextStation();
      setMusicStatus(music.getStatusText());
    } else if (input === "h" && activeTab === "group" && !jamManager) {
      startHosting();
    } else if (input === "j" && activeTab === "group" && !jamManager) {
      setJoinMode(true); setJoinCodeInput("");
    } else if (input === "e" && activeTab === "group" && !jamManager) {
      setEditNameMode(true); setNameInput(userName);
    } else if (/^[1-9]$/.test(input)) {
      const manager = jamManagerRef.current;
      const participants = jamParticipantsRef.current;
      const amHost = isCurrentHostRef.current;
      if (amHost && manager) {
        const myId = manager.getParticipantId();
        const otherParticipants = participants.filter((p) => p.id !== myId && !p.isHost);
        const index = parseInt(input, 10) - 1;
        if (index < otherParticipants.length) manager.transferHost(otherParticipants[index].id);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={2}>
      <Tabs activeTab={activeTab} />

      {updateAvailable && (
        <Box marginY={1} flexDirection="column" alignItems="center">
          <Text color="yellow">Update available: {updateAvailable}</Text>
          <Text color="gray">(run pomotui --update)</Text>
        </Box>
      )}

      {activeTab === "timer" && (
        <TimerTab
          state={state}
          config={config.pomodoro}
          isJamMode={isJamMode}
          isCurrentHost={isCurrentHost}
          canControl={canControl}
          jamSessionCode={jamSessionCode}
          jamConnectionState={jamConnectionState}
          jamParticipants={jamParticipants}
          jamManagerId={jamManager?.getParticipantId()}
          todayStats={todayStats}
          musicStatus={musicStatus}
          formatTime={pomodoro.formatTime.bind(pomodoro)}
          tasks={tasks}
          selectedTaskIndex={selectedTaskIndex}
          addTaskMode={addTaskMode}
          taskInput={taskInput}
        />
      )}

      {activeTab === "stats" && (
        <StatsTab state={state} config={config.pomodoro} todayStats={todayStats} />
      )}

      {activeTab === "group" && (
        <GroupTab
          isJamMode={isJamMode}
          isCurrentHost={isCurrentHost}
          jamSessionCode={jamSessionCode}
          jamConnectionState={jamConnectionState}
          jamParticipants={jamParticipants}
          jamManagerId={jamManager?.getParticipantId()}
          userName={userName}
          editNameMode={editNameMode}
          nameInput={nameInput}
          joinMode={joinMode}
          joinCodeInput={joinCodeInput}
        />
      )}

      <Controls
        canControl={canControl}
        isCurrentHost={isCurrentHost}
        showTransferHint={jamParticipants.length > 1}
      />
    </Box>
  );
}

const config = parseConfig();
if (config) {
  render(<PomodoroTUI config={config} />);
}
