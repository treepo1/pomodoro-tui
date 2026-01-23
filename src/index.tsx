import { useState, useEffect, useRef } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react";
import { Pomodoro } from "./pomodoro";
import { HistoryManager } from "./history";
import { MusicManager } from "./music";
import { JamManager, validateSessionCode, normalizeSessionCode } from "./jam";
import type {
  PomodoroState,
  JamParticipant,
  JamConnectionState,
} from "./types";
import { checkForUpdates } from "./updater";
import { parseConfig } from "./cli";
import { getSessionDuration, notifyUser } from "./utils";
import {
  Tabs,
  TABS,
  type ActiveTab,
  TimerTab,
  ProjectsTab,
  StatsTab,
  GroupTab,
  Controls,
} from "./components";
import { ProjectManager, type Project } from "./projects";
import { SettingsManager } from "./settings";
import { getNextPetId, DEFAULT_PET_ID } from "./pets";

interface PomodoroTUIProps {
  config: ReturnType<typeof parseConfig> & {};
  onExit: (completedPomodoros: number) => void;
}

function PomodoroTUI({ config, onExit }: PomodoroTUIProps) {
  const [settingsManager] = useState(() => new SettingsManager());
  const savedMusicSettings = settingsManager.getMusicSettings();
  const [pomodoro] = useState(() => new Pomodoro(config.pomodoro));
  const [history] = useState(() => new HistoryManager(config.historyFile));
  const [music] = useState(
    () =>
      new MusicManager(
        config.musicMode,
        config.volume !== undefined ? config.volume : savedMusicSettings.volume,
        savedMusicSettings.stationIndex,
      ),
  );
  const [state, setState] = useState<PomodoroState>(pomodoro.getState());
  const [todayStats, setTodayStats] = useState(history.getTodayStats());
  const [musicStatus, setMusicStatus] = useState(music.getStatusText());
  const [petId, setPetId] = useState(config.petId || DEFAULT_PET_ID);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("timer");
  const [joinMode, setJoinMode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [editNameMode, setEditNameMode] = useState(false);
  const [userName, setUserNameState] = useState(
    () => config.jam.participantName || settingsManager.getUserName(),
  );
  const [nameInput, setNameInput] = useState("");

  const setUserName = (name: string) => {
    setUserNameState(name);
    settingsManager.setUserName(name);
  };

  // Project tracker state (all tasks belong to projects now)
  const [projectManager] = useState(() => new ProjectManager());
  const [projects, setProjects] = useState<Project[]>(() =>
    projectManager.getProjects(),
  );
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() =>
    projectManager.getCurrentProjectId(),
  );

  // Timer tab task state (operates on current project)
  const [timerSelectedTaskIndex, setTimerSelectedTaskIndex] = useState(0);
  const [timerAddTaskMode, setTimerAddTaskMode] = useState(false);
  const [timerTaskInput, setTimerTaskInput] = useState("");

  // Projects tab state
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [selectedProjectTaskIndex, setSelectedProjectTaskIndex] = useState(0);
  const [projectViewMode, setProjectViewMode] = useState<"list" | "detail">(
    "list",
  );
  const [addProjectMode, setAddProjectMode] = useState(false);
  const [projectInput, setProjectInput] = useState("");
  const [addProjectTaskMode, setAddProjectTaskMode] = useState(false);
  const [projectTaskInput, setProjectTaskInput] = useState("");

  // Jam session state
  const [jamManager, setJamManager] = useState<JamManager | null>(null);
  const [jamParticipants, setJamParticipants] = useState<JamParticipant[]>([]);
  const [jamConnectionState, setJamConnectionState] =
    useState<JamConnectionState>("disconnected");
  const [jamSessionCode, setJamSessionCode] = useState<string>("");
  const [isCurrentHost, setIsCurrentHost] = useState<boolean>(
    config.jam.isHost,
  );

  // Refs for stale closure avoidance
  const jamManagerRef = useRef<JamManager | null>(null);
  const jamParticipantsRef = useRef<JamParticipant[]>([]);
  const isCurrentHostRef = useRef<boolean>(config.jam.isHost);

  useEffect(() => {
    jamManagerRef.current = jamManager;
  }, [jamManager]);
  useEffect(() => {
    jamParticipantsRef.current = jamParticipants;
  }, [jamParticipants]);
  useEffect(() => {
    isCurrentHostRef.current = isCurrentHost;
  }, [isCurrentHost]);

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

  const stopSession = () => {
    if (!jamManager) return;
    jamManager.disconnect();
    setJamManager(null);
    jamManagerRef.current = null;
    setJamSessionCode("");
    setJamParticipants([]);
    setJamConnectionState("disconnected");
    setIsCurrentHost(false);
    isCurrentHostRef.current = false;
  };

  // Version check on startup
  useEffect(() => {
    checkForUpdates()
      .then((result) => {
        if (result.updateAvailable) setUpdateAvailable(result.latestVersion);
      })
      .catch(() => {});
  }, []);

  // Auto-play music if it was playing in previous session
  useEffect(() => {
    if (savedMusicSettings.isPlaying) {
      music.play().then(() => {
        setMusicStatus(music.getStatusText());
      });
    }
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
        participantName: config.jam.participantName || "",
        server: config.jam.server,
        onStateChange: () => setState(pomodoro.getState()),
        onParticipantsChange: (participants) =>
          setJamParticipants(participants),
        onConnectionChange: (connState) => setJamConnectionState(connState),
        onHostChange: (isHost) => setIsCurrentHost(isHost),
      });
      setJamManager(manager);
      setJamSessionCode(manager.getSessionCode());
      manager.connect().catch(() => {});
    }

    return () => {
      pomodoro.stop();
      music.cleanup();
      jamManager?.disconnect();
    };
  }, []);

  // Helper to get project stats
  const getProjectStats = (id: string) => projectManager.getProjectStats(id);

  // Get current project and its data
  const currentProject = projectManager.getCurrentProject();
  const currentProjectStats = currentProject
    ? getProjectStats(currentProject.id)
    : { total: 0, completed: 0, percentage: 0 };
  const currentProjectTasks = currentProject?.tasks || [];
  const currentProjectIndex = projects.findIndex(
    (p) => p.id === currentProjectId,
  );

  // Helper to get tasks sorted (pending first, then completed)
  const getSortedTasks = (project: Project | null) => {
    if (!project) return [];
    const pending = project.tasks.filter((t) => !t.completed);
    const completed = project.tasks.filter((t) => t.completed);
    return [...pending, ...completed];
  };

  // Input handling with OpenTUI's useKeyboard hook
  useKeyboard((key) => {
    const input = key.sequence;
    const isReturn = key.name === "return";
    const isEscape = key.name === "escape";
    const isBackspace = key.name === "backspace";
    const isDelete = key.name === "delete";
    const isTab = key.name === "tab";
    const isUpArrow = key.name === "up";
    const isDownArrow = key.name === "down";
    const isLeftArrow = key.name === "left";
    const isRightArrow = key.name === "right";
    const isCtrl = key.ctrl;

    // Add project mode (Projects tab)
    if (addProjectMode) {
      if (isEscape) {
        setAddProjectMode(false);
        setProjectInput("");
        return;
      }
      if (isReturn) {
        if (projectInput.trim().length > 0) {
          const newProject = projectManager.createProject(projectInput.trim());
          setProjects(projectManager.getProjects());
          // Set as current if it's the first project
          if (projects.length === 0) {
            projectManager.setCurrentProject(newProject.id);
            setCurrentProjectId(newProject.id);
          }
        }
        setAddProjectMode(false);
        setProjectInput("");
        return;
      }
      if (key.backspace || key.delete) {
        setProjectInput((p) => p.slice(0, -1));
        return;
      }
      if (isBackspace || isDelete) {
        setProjectInput((p) => p.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32)
        setProjectInput((p) => p + input);
      return;
    }

    // Add project task mode (Projects tab detail view)
    if (addProjectTaskMode) {
      if (isEscape) {
        setAddProjectTaskMode(false);
        setProjectTaskInput("");
        return;
      }
      if (isReturn) {
        if (
          projectTaskInput.trim().length > 0 &&
          projects[selectedProjectIndex]
        ) {
          projectManager.addTask(
            projects[selectedProjectIndex].id,
            projectTaskInput.trim(),
          );
          setProjects(projectManager.getProjects());
        }
        setAddProjectTaskMode(false);
        setProjectTaskInput("");
        return;
      }
      if (key.backspace || key.delete) {
        setProjectTaskInput((p) => p.slice(0, -1));
        return;
      }
      if (isBackspace || isDelete) {
        setProjectTaskInput((p) => p.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32)
        setProjectTaskInput((p) => p + input);
      return;
    }

    // Add task mode (Timer tab - adds to current project)
    if (timerAddTaskMode) {
      if (isEscape) {
        setTimerAddTaskMode(false);
        setTimerTaskInput("");
        return;
      }
      if (isReturn) {
        if (timerTaskInput.trim().length > 0) {
          // Auto-create "General" project if no projects exist
          const targetProject = projectManager.getOrCreateDefaultProject();
          projectManager.addTask(targetProject.id, timerTaskInput.trim());
          setProjects(projectManager.getProjects());
          setCurrentProjectId(projectManager.getCurrentProjectId());
        }
        setTimerAddTaskMode(false);
        setTimerTaskInput("");
        return;
      }
      if (key.backspace || key.delete) {
        setTimerTaskInput((p) => p.slice(0, -1));
        return;
      }
      if (isBackspace || isDelete) {
        setTimerTaskInput((p) => p.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32)
        setTimerTaskInput((p) => p + input);
      return;
    }

    // Name edit mode
    if (editNameMode) {
      if (isEscape) {
        setEditNameMode(false);
        setNameInput("");
        return;
      }
      if (isReturn) {
        if (nameInput.trim().length > 0) setUserName(nameInput.trim());
        setEditNameMode(false);
        setNameInput("");
        return;
      }
      if (isBackspace || isDelete) {
        setNameInput((p) => p.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32)
        setNameInput((p) => (p + input).slice(0, 20));
      return;
    }

    // Join mode
    if (joinMode) {
      if (isEscape) {
        setJoinMode(false);
        setJoinCodeInput("");
        return;
      }
      if (isReturn) {
        if (joinCodeInput.length >= 6) {
          joinSession(joinCodeInput);
          setJoinMode(false);
          setJoinCodeInput("");
        }
        return;
      }
      if (isBackspace || isDelete) {
        setJoinCodeInput((p) => p.slice(0, -1));
        return;
      }
      if (input && input.length === 1) {
        const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (cleaned.length > 0)
          setJoinCodeInput((p) => (p + cleaned).slice(0, 6));
      }
      return;
    }

    // Timer tab controls
    if (activeTab === "timer") {
      const sortedTasks = getSortedTasks(currentProject);

      // Switch to previous project with [
      if (input === "[") {
        if (projects.length > 0) {
          const currentIdx = projects.findIndex(
            (p) => p.id === currentProjectId,
          );
          const newIdx = currentIdx <= 0 ? projects.length - 1 : currentIdx - 1;
          projectManager.setCurrentProject(projects[newIdx].id);
          setCurrentProjectId(projects[newIdx].id);
          setTimerSelectedTaskIndex(0);
          setProjects(projectManager.getProjects());
        }
        return;
      }

      // Switch to next project with ]
      if (input === "]") {
        if (projects.length > 0) {
          const currentIdx = projects.findIndex(
            (p) => p.id === currentProjectId,
          );
          const newIdx = (currentIdx + 1) % projects.length;
          projectManager.setCurrentProject(projects[newIdx].id);
          setCurrentProjectId(projects[newIdx].id);
          setTimerSelectedTaskIndex(0);
          setProjects(projectManager.getProjects());
        }
        return;
      }

      // Task navigation with Up/Down arrows
      if (isUpArrow) {
        if (sortedTasks.length > 0) {
          setTimerSelectedTaskIndex(
            (p) => (p - 1 + sortedTasks.length) % sortedTasks.length,
          );
        }
        return;
      }
      if (isDownArrow) {
        if (sortedTasks.length > 0) {
          setTimerSelectedTaskIndex((p) => (p + 1) % sortedTasks.length);
        }
        return;
      }

      // Toggle task with Space
      if (
        input === " " &&
        currentProject &&
        sortedTasks[timerSelectedTaskIndex]
      ) {
        projectManager.toggleTask(
          currentProject.id,
          sortedTasks[timerSelectedTaskIndex].id,
        );
        setProjects(projectManager.getProjects());
        return;
      }

      // Add task mode with 'a'
      if (input === "a") {
        setTimerAddTaskMode(true);
        setTimerTaskInput("");
        return;
      }

      // Delete task with 'd'
      if (
        input === "d" &&
        currentProject &&
        sortedTasks[timerSelectedTaskIndex]
      ) {
        projectManager.deleteTask(
          currentProject.id,
          sortedTasks[timerSelectedTaskIndex].id,
        );
        setProjects(projectManager.getProjects());
        // Adjust selection
        const newSortedTasks = getSortedTasks(
          projectManager.getProject(currentProject.id) || null,
        );
        if (timerSelectedTaskIndex >= newSortedTasks.length) {
          setTimerSelectedTaskIndex(Math.max(0, newSortedTasks.length - 1));
        }
        return;
      }
    }

    // Projects tab controls
    if (activeTab === "projects") {
      // Navigate projects in list view with < and >
      if (projectViewMode === "list") {
        if (input === "," || input === "<") {
          if (projects.length > 0) {
            setSelectedProjectIndex(
              (p) => (p - 1 + projects.length) % projects.length,
            );
          }
          return;
        }
        if (input === "." || input === ">") {
          if (projects.length > 0) {
            setSelectedProjectIndex((p) => (p + 1) % projects.length);
          }
          return;
        }
        // Create new project with 'c'
        if (input === "c") {
          setAddProjectMode(true);
          setProjectInput("");
          return;
        }
        // Delete project with 'D' (uppercase)
        if (input === "D" && projects[selectedProjectIndex]) {
          projectManager.deleteProject(projects[selectedProjectIndex].id);
          setProjects(projectManager.getProjects());
          setCurrentProjectId(projectManager.getCurrentProjectId());
          if (selectedProjectIndex >= projects.length - 1) {
            setSelectedProjectIndex(Math.max(0, projects.length - 2));
          }
          return;
        }
        // Enter detail view or set current project with Enter
        if (isReturn && projects[selectedProjectIndex]) {
          setProjectViewMode("detail");
          setSelectedProjectTaskIndex(0);
          return;
        }
      }

      // Detail view controls
      if (projectViewMode === "detail" && projects[selectedProjectIndex]) {
        const project = projects[selectedProjectIndex];
        const allProjectTasks = getSortedTasks(project);

        // Go back with Escape
        if (isEscape) {
          setProjectViewMode("list");
          return;
        }

        // Navigate tasks with Up/Down
        if (isUpArrow && allProjectTasks.length > 0) {
          setSelectedProjectTaskIndex(
            (p) => (p - 1 + allProjectTasks.length) % allProjectTasks.length,
          );
          return;
        }
        if (isDownArrow && allProjectTasks.length > 0) {
          setSelectedProjectTaskIndex((p) => (p + 1) % allProjectTasks.length);
          return;
        }

        // Toggle task with Space
        if (input === " " && allProjectTasks[selectedProjectTaskIndex]) {
          projectManager.toggleTask(
            project.id,
            allProjectTasks[selectedProjectTaskIndex].id,
          );
          setProjects(projectManager.getProjects());
          return;
        }

        // Add task with 'a'
        if (input === "a") {
          setAddProjectTaskMode(true);
          setProjectTaskInput("");
          return;
        }

        // Delete task with 'd'
        if (input === "d" && allProjectTasks[selectedProjectTaskIndex]) {
          projectManager.deleteTask(
            project.id,
            allProjectTasks[selectedProjectTaskIndex].id,
          );
          setProjects(projectManager.getProjects());
          const updatedProject = projectManager.getProject(project.id);
          const newAllTasks = getSortedTasks(updatedProject || null);
          if (selectedProjectTaskIndex >= newAllTasks.length) {
            setSelectedProjectTaskIndex(Math.max(0, newAllTasks.length - 1));
          }
          return;
        }

        // Set as current project with Enter
        if (isReturn) {
          projectManager.setCurrentProject(project.id);
          setCurrentProjectId(project.id);
          return;
        }
      }

      // Don't process tab switching within projects tab for arrow keys
      if (isUpArrow || isDownArrow) return;
    }

    // Tab switching with Tab and Left/Right arrows
    if (isTab || isRightArrow) {
      setActiveTab((p) => TABS[(TABS.indexOf(p) + 1) % TABS.length]);
      return;
    }
    if (isLeftArrow) {
      setActiveTab(
        (p) => TABS[(TABS.indexOf(p) - 1 + TABS.length) % TABS.length],
      );
      return;
    }

    // Global controls
    if (input === "q" || isEscape || (isCtrl && input === "c")) {
      pomodoro.stop();
      music.cleanup();
      jamManager?.disconnect();
      onExit(state.completedPomodoros);
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
      settingsManager.setMusicIsPlaying(music.isPlaying());
    } else if (input === ">" || input === ".") {
      music.nextStation();
      setMusicStatus(music.getStatusText());
      settingsManager.setMusicStationIndex(music.getStationIndex());
    } else if (input === "+" || input === "=") {
      music.volumeUp();
      setMusicStatus(music.getStatusText());
      settingsManager.setMusicVolume(music.getVolume());
    } else if (input === "-" || input === "_") {
      music.volumeDown();
      setMusicStatus(music.getStatusText());
    } else if (input === "P") {
      setPetId((current) => getNextPetId(current));
    } else if (input === "h" && activeTab === "group" && !jamManager) {
      startHosting();
    } else if (input === "j" && activeTab === "group" && !jamManager) {
      setJoinMode(true);
      setJoinCodeInput("");
    } else if (input === "e" && activeTab === "group" && !jamManager) {
      setEditNameMode(true);
      setNameInput(userName);
    } else if (input === "l" && activeTab === "group" && jamManager) {
      stopSession();
    } else if (/^[1-9]$/.test(input || "")) {
      const manager = jamManagerRef.current;
      const participants = jamParticipantsRef.current;
      const amHost = isCurrentHostRef.current;
      if (amHost && manager) {
        const myId = manager.getParticipantId();
        const otherParticipants = participants.filter(
          (p) => p.id !== myId && !p.isHost,
        );
        const index = parseInt(input || "0", 10) - 1;
        if (index < otherParticipants.length)
          manager.transferHost(otherParticipants[index].id);
      }
    }
  });

  // Get terminal dimensions for responsive layout
  const { width: termWidth } = useTerminalDimensions();
  const isNarrow = termWidth < 60;
  const padding = isNarrow ? 1 : 2;

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor="yellow"
      padding={padding}
    >
      <Tabs activeTab={activeTab} onTabClick={(tab) => setActiveTab(tab)} />

      {updateAvailable && (
        <box
          marginTop={1}
          marginBottom={1}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="yellow">Update available: {updateAvailable}</text>
          <text fg="gray">(run pomotui --update)</text>
        </box>
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
          petId={petId}
          formatTime={pomodoro.formatTime.bind(pomodoro)}
          currentProject={currentProject}
          projectTasks={currentProjectTasks}
          selectedTaskIndex={timerSelectedTaskIndex}
          addTaskMode={timerAddTaskMode}
          taskInput={timerTaskInput}
          projectStats={currentProjectStats}
          projectIndex={currentProjectIndex}
          totalProjects={projects.length}
          onTaskClick={(idx) => {
            // Toggle the task on click
            if (currentProject) {
              const sortedTasks = getSortedTasks(currentProject);
              if (sortedTasks[idx]) {
                projectManager.toggleTask(
                  currentProject.id,
                  sortedTasks[idx].id,
                );
                setProjects(projectManager.getProjects());
              }
              setTimerSelectedTaskIndex(idx);
            }
          }}
          onToggleTimer={() => {
            if (!canControl) return;
            if (state.isRunning) {
              pomodoro.pause();
            } else {
              pomodoro.start();
            }
            // Jam mode state sync happens automatically via the timer
          }}
        />
      )}

      {activeTab === "projects" && (
        <ProjectsTab
          projects={projects}
          currentProjectId={currentProjectId}
          selectedProjectIndex={selectedProjectIndex}
          selectedTaskIndex={selectedProjectTaskIndex}
          viewMode={projectViewMode}
          addProjectMode={addProjectMode}
          projectInput={projectInput}
          addTaskMode={addProjectTaskMode}
          taskInput={projectTaskInput}
          getProjectStats={getProjectStats}
          onProjectClick={(idx) => {
            if (projectViewMode === "list") {
              // Select the project and open detail view
              setSelectedProjectIndex(idx);
              setProjectViewMode("detail");
              setSelectedProjectTaskIndex(0);
            }
          }}
          onTaskClick={(idx) => {
            if (
              projectViewMode === "detail" &&
              projects[selectedProjectIndex]
            ) {
              // Toggle the task on click
              const project = projects[selectedProjectIndex];
              const pendingTasks = project.tasks.filter((t) => !t.completed);
              const completedTasks = project.tasks.filter((t) => t.completed);
              const allTasks = [...pendingTasks, ...completedTasks];
              if (allTasks[idx]) {
                projectManager.toggleTask(project.id, allTasks[idx].id);
                setProjects(projectManager.getProjects());
              }
              setSelectedProjectTaskIndex(idx);
            }
          }}
        />
      )}

      {activeTab === "stats" && (
        <StatsTab
          state={state}
          config={config.pomodoro}
          todayStats={todayStats}
          weekStats={history.getWeekStats()}
          monthStats={history.getMonthStats()}
          allTimeStats={history.getAllTimeStats()}
          dailyStats={history.getDailyStats(7)}
          streak={history.getCurrentStreak()}
          averagePomodoros={history.getAveragePomodoros()}
          projectStats={projectManager.getOverallStats()}
          topProjects={projectManager.getTopProjects(4)}
          lastWeekStats={history.getLastWeekStats()}
          mostProductiveDay={history.getMostProductiveDay()}
        />
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
        petId={petId}
      />
    </box>
  );
}

const config = parseConfig();
if (config) {
  (async () => {
    let completedPomodoros = 0;

    const renderer = await createCliRenderer({
      exitOnCtrlC: false,
      onDestroy: () => {
        console.log(
          `\nGoodbye! You completed ${completedPomodoros} pomodoros.`,
        );
        process.exit(0);
      },
    });

    const root = createRoot(renderer);
    root.render(
      <PomodoroTUI
        config={config}
        onExit={(completed) => {
          completedPomodoros = completed;
          // Unmount the React tree first, then destroy the renderer
          root.unmount();
          renderer.destroy();
        }}
      />,
    );
  })();
}
