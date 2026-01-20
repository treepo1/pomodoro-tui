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
  ProjectsTab,
  StatsTab,
  GroupTab,
  Controls,
} from "./components";
import { ProjectManager, type Project } from "./projects";
import { SettingsManager } from "./settings";

interface PomodoroTUIProps {
  config: ReturnType<typeof parseConfig> & {};
}

function PomodoroTUI({ config }: PomodoroTUIProps) {
  const { exit } = useApp();
  const [pomodoro] = useState(() => new Pomodoro(config.pomodoro));
  const [history] = useState(() => new HistoryManager(config.historyFile));
  const [music] = useState(() => new MusicManager(config.musicMode, config.volume));
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

  // Project tracker state (all tasks belong to projects now)
  const [projectManager] = useState(() => new ProjectManager());
  const [projects, setProjects] = useState<Project[]>(() => projectManager.getProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => projectManager.getCurrentProjectId());
  
  // Timer tab task state (operates on current project)
  const [timerSelectedTaskIndex, setTimerSelectedTaskIndex] = useState(0);
  const [timerAddTaskMode, setTimerAddTaskMode] = useState(false);
  const [timerTaskInput, setTimerTaskInput] = useState("");

  // Projects tab state
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [selectedProjectTaskIndex, setSelectedProjectTaskIndex] = useState(0);
  const [projectViewMode, setProjectViewMode] = useState<"list" | "detail">("list");
  const [addProjectMode, setAddProjectMode] = useState(false);
  const [projectInput, setProjectInput] = useState("");
  const [addProjectTaskMode, setAddProjectTaskMode] = useState(false);
  const [projectTaskInput, setProjectTaskInput] = useState("");
  const [taskListCollapsed, setTaskListCollapsed] = useState(false);

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
        participantName: config.jam.participantName || '',
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

  // Helper to get project stats
  const getProjectStats = (id: string) => projectManager.getProjectStats(id);
  
  // Get current project and its data
  const currentProject = projectManager.getCurrentProject();
  const currentProjectStats = currentProject 
    ? getProjectStats(currentProject.id) 
    : { total: 0, completed: 0, percentage: 0 };
  const currentProjectTasks = currentProject?.tasks || [];
  const currentProjectIndex = projects.findIndex(p => p.id === currentProjectId);

  // Helper to get tasks sorted (pending first, then completed)
  const getSortedTasks = (project: Project | null) => {
    if (!project) return [];
    const pending = project.tasks.filter(t => !t.completed);
    const completed = project.tasks.filter(t => t.completed);
    return [...pending, ...completed];
  };

  // Input handling
  useInput((input, key) => {
    // Add project mode (Projects tab)
    if (addProjectMode) {
      if (key.escape) { setAddProjectMode(false); setProjectInput(""); return; }
      if (key.return) {
        if (projectInput.trim().length > 0) {
          const newProject = projectManager.createProject(projectInput.trim());
          setProjects(projectManager.getProjects());
          // Set as current if it's the first project
          if (projects.length === 0) {
            projectManager.setCurrentProject(newProject.id);
            setCurrentProjectId(newProject.id);
          }
        }
        setAddProjectMode(false); setProjectInput(""); return;
      }
      if (key.backspace || key.delete) { setProjectInput((p) => p.slice(0, -1)); return; }
      if (input && input.length > 0) setProjectInput((p) => p + input);
      return;
    }

    // Add project task mode (Projects tab detail view)
    if (addProjectTaskMode) {
      if (key.escape) { setAddProjectTaskMode(false); setProjectTaskInput(""); return; }
      if (key.return) {
        if (projectTaskInput.trim().length > 0 && projects[selectedProjectIndex]) {
          projectManager.addTask(projects[selectedProjectIndex].id, projectTaskInput.trim());
          setProjects(projectManager.getProjects());
        }
        setAddProjectTaskMode(false); setProjectTaskInput(""); return;
      }
      if (key.backspace || key.delete) { setProjectTaskInput((p) => p.slice(0, -1)); return; }
      if (input && input.length > 0) setProjectTaskInput((p) => p + input);
      return;
    }

    // Add task mode (Timer tab - adds to current project)
    if (timerAddTaskMode) {
      if (key.escape) { setTimerAddTaskMode(false); setTimerTaskInput(""); return; }
      if (key.return) {
        if (timerTaskInput.trim().length > 0) {
          // Auto-create "General" project if no projects exist
          const targetProject = projectManager.getOrCreateDefaultProject();
          projectManager.addTask(targetProject.id, timerTaskInput.trim());
          setProjects(projectManager.getProjects());
          setCurrentProjectId(projectManager.getCurrentProjectId());
        }
        setTimerAddTaskMode(false); setTimerTaskInput(""); return;
      }
      if (key.backspace || key.delete) { setTimerTaskInput((p) => p.slice(0, -1)); return; }
      if (input && input.length > 0) setTimerTaskInput((p) => p + input);
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

    // Timer tab controls
    if (activeTab === "timer") {
      // Toggle task list collapse with 't' - always available
      if (input === "t") {
        setTaskListCollapsed((prev) => !prev);
        return;
      }

      // Task-related controls only available when task list is expanded
      if (!taskListCollapsed) {
        const sortedTasks = getSortedTasks(currentProject);

        // Switch to previous project with [
        if (input === "[") {
          if (projects.length > 0) {
            const currentIdx = projects.findIndex(
              (p) => p.id === currentProjectId,
            );
            const newIdx =
              currentIdx <= 0 ? projects.length - 1 : currentIdx - 1;
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
        if (key.upArrow) {
          if (sortedTasks.length > 0) {
            setTimerSelectedTaskIndex(
              (p) => (p - 1 + sortedTasks.length) % sortedTasks.length,
            );
          }
          return;
        }
        if (key.downArrow) {
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
    }

    // Projects tab controls
    if (activeTab === "projects") {
      // Navigate projects in list view with < and >
      if (projectViewMode === "list") {
        if (input === "," || input === "<") {
          if (projects.length > 0) {
            setSelectedProjectIndex((p) => (p - 1 + projects.length) % projects.length);
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
        if (key.return && projects[selectedProjectIndex]) {
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
        if (key.escape) {
          setProjectViewMode("list");
          return;
        }

        // Navigate tasks with Up/Down
        if (key.upArrow && allProjectTasks.length > 0) {
          setSelectedProjectTaskIndex((p) => (p - 1 + allProjectTasks.length) % allProjectTasks.length);
          return;
        }
        if (key.downArrow && allProjectTasks.length > 0) {
          setSelectedProjectTaskIndex((p) => (p + 1) % allProjectTasks.length);
          return;
        }

        // Toggle task with Space
        if (input === " " && allProjectTasks[selectedProjectTaskIndex]) {
          projectManager.toggleTask(project.id, allProjectTasks[selectedProjectTaskIndex].id);
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
          projectManager.deleteTask(project.id, allProjectTasks[selectedProjectTaskIndex].id);
          setProjects(projectManager.getProjects());
          const updatedProject = projectManager.getProject(project.id);
          const newAllTasks = getSortedTasks(updatedProject || null);
          if (selectedProjectTaskIndex >= newAllTasks.length) {
            setSelectedProjectTaskIndex(Math.max(0, newAllTasks.length - 1));
          }
          return;
        }

        // Set as current project with Enter
        if (key.return) {
          projectManager.setCurrentProject(project.id);
          setCurrentProjectId(project.id);
          return;
        }
      }

      // Don't process tab switching within projects tab for arrow keys
      if (key.upArrow || key.downArrow) return;
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
    } else if (input === "+" || input === "=") {
      music.volumeUp();
      setMusicStatus(music.getStatusText());
    } else if (input === "-" || input === "_") {
      music.volumeDown();
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
          currentProject={currentProject}
          projectTasks={currentProjectTasks}
          selectedTaskIndex={timerSelectedTaskIndex}
          addTaskMode={timerAddTaskMode}
          taskInput={timerTaskInput}
          projectStats={currentProjectStats}
          projectIndex={currentProjectIndex}
          totalProjects={projects.length}
          taskListCollapsed={taskListCollapsed}
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
      />
    </Box>
  );
}

const config = parseConfig();
if (config) {
  render(<PomodoroTUI config={config} />);
}
