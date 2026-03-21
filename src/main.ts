import { PeerConnection } from "./network/PeerConnection";
import { Message } from "./network/Protocol";
import { MusicEngine } from "./audio/MusicEngine";
import { LobbyScreen } from "./ui/LobbyScreen";
import { GameScreen } from "./ui/GameScreen";
import { GameOverScreen } from "./ui/GameOverScreen";

const app = document.getElementById("app")!;
const lobbyMusic = new MusicEngine();
let lobbyMusicStarted = false;

function ensureLobbyMusic(): void {
  if (lobbyMusicStarted) return;
  lobbyMusicStarted = true;
  const muted = localStorage.getItem("dropster-muted") === "true";
  lobbyMusic.muted = muted;
  lobbyMusic.setBpm(85);
  lobbyMusic.start();
}

let lobby: LobbyScreen | null = null;
let gameScreen: GameScreen | null = null;
let gameOverScreen: GameOverScreen | null = null;
let peer: PeerConnection | null = null;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
let localReady = false;
let remoteReady = false;

function showLobby(): void {
  cleanup();
  lobby = new LobbyScreen(app, {
    onCreateRoom: handleCreateRoom,
    onJoinRoom: handleJoinRoom,
    onSolo: handleSolo,
  });
}

async function handleCreateRoom(): Promise<void> {
  ensureLobbyMusic();
  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });

  try {
    const code = await peer.createRoom();
    lobby?.showRoomCode(code);
  } catch {
    lobby?.setStatus("Failed to create room. Try again.");
  }
}

async function handleJoinRoom(code: string): Promise<void> {
  ensureLobbyMusic();
  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });

  try {
    await peer.joinRoom(code);
    lobby?.setStatus("Connected! Waiting for opponent...");
    localReady = true;
    peer.send({ type: "ready" });
    if (remoteReady) startGame();
  } catch {
    lobby?.setStatus("Could not connect. Check the code and try again.");
  }
}


function handleSolo(): void {
  ensureLobbyMusic();
  startGame();
}

function handleMessage(msg: Message): void {
  switch (msg.type) {
    case "ready":
      remoteReady = true;
      if (!localReady) {
        localReady = true;
        peer?.send({ type: "ready" });
      }
      if (!gameScreen) startGame();
      break;
    case "garbage":
      gameScreen?.receiveGarbage(msg.lines);
      break;
    case "board":
      gameScreen?.updateOpponentBoard(msg.grid);
      break;
    case "gameOver":
      showGameOver(true);
      break;
    case "pause":
      peer?.send({ type: "pauseAccept" });
      gameScreen?.setPaused(true);
      break;
    case "pauseAccept":
      gameScreen?.setPaused(true);
      break;
    case "pauseDeny":
      gameScreen?.setPaused(false);
      break;
    case "unpause":
      gameScreen?.setPaused(false);
      break;
  }
}

function handleDisconnect(): void {
  if (disconnectTimer) return;
  disconnectTimer = setTimeout(() => {
    if (gameScreen) {
      showGameOver(true);
    }
    disconnectTimer = null;
  }, 5000);
}

function startGame(): void {
  lobbyMusic.stop();
  lobbyMusicStarted = false;
  lobby?.destroy();
  lobby = null;

  gameScreen = new GameScreen(app);

  gameScreen.onSendGarbage = (lines) => peer?.send({ type: "garbage", lines });
  gameScreen.onSendBoard = (grid) => peer?.send({ type: "board", grid });
  gameScreen.onGameOver = () => {
    peer?.send({ type: "gameOver" });
    showGameOver(false);
  };
  gameScreen.onPauseRequest = () => peer?.send({ type: "pause" });
  gameScreen.onQuit = () => {
    gameScreen?.destroy();
    gameScreen = null;
    peer?.destroy();
    peer = null;
    showLobby();
  };

  gameScreen.startCountdown(() => {
    gameScreen?.startGame();
  });
}

function showGameOver(won: boolean): void {
  const score = gameScreen?.getScore() ?? 0;
  const isNewHighScore = gameScreen?.getIsNewHighScore() ?? false;
  const highScore = gameScreen?.getHighScore() ?? 0;
  gameScreen?.destroy();
  gameScreen = null;

  gameOverScreen = new GameOverScreen(
    app,
    won,
    score,
    () => {},
    () => {
      gameOverScreen?.destroy();
      gameOverScreen = null;
      peer?.destroy();
      peer = null;
      ensureLobbyMusic();
      showLobby();
    },
    isNewHighScore,
    highScore
  );
}

function cleanup(): void {
  lobby?.destroy();
  lobby = null;
  gameScreen?.destroy();
  gameScreen = null;
  gameOverScreen?.destroy();
  gameOverScreen = null;
  peer?.destroy();
  peer = null;
  localReady = false;
  remoteReady = false;
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
}

showLobby();
