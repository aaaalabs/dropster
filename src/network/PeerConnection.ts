import Peer, { DataConnection } from "peerjs";
import { Message, encodeMessage, decodeMessage } from "./Protocol";

export type ConnectionCallback = (msg: Message) => void;
export type StatusCallback = (status: string) => void;

const CONNECTION_TIMEOUT = 12000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const METERED_API_URL = (import.meta as any).env?.VITE_METERED_API_URL as string | undefined;

async function fetchIceServers(): Promise<RTCIceServer[]> {
  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  if (!METERED_API_URL) return fallback;
  try {
    const res = await fetch(METERED_API_URL);
    const servers = await res.json();
    return servers;
  } catch {
    return fallback;
  }
}

function createPeerWithIce(iceServers: RTCIceServer[], id?: string): Peer {
  const opts = { config: { iceServers } };
  return id ? new Peer(id, opts) : new Peer(opts);
}

export class PeerConnection {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onMessage: ConnectionCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private onDisconnect: (() => void) | null = null;
  private iceServers: RTCIceServer[] = [];

  setHandlers(handlers: {
    onMessage: ConnectionCallback;
    onStatus: StatusCallback;
    onDisconnect: () => void;
  }): void {
    this.onMessage = handlers.onMessage;
    this.onStatus = handlers.onStatus;
    this.onDisconnect = handlers.onDisconnect;
  }

  private async ensureIce(): Promise<void> {
    if (this.iceServers.length === 0) {
      this.iceServers = await fetchIceServers();
    }
  }

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      const code = this.generateCode();
      const peerId = `tb-${code}`;
      this.peer = new Peer(peerId);

      this.peer.on("open", () => {
        this.onStatus?.("Waiting for opponent...");
        resolve(code);
      });

      this.peer.on("connection", (conn) => {
        this.conn = conn;
        this.setupConnection();
      });

      this.peer.on("error", (err) => {
        reject(err);
      });
    });
  }

  joinRoom(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on("open", () => {
        this.onStatus?.("Connecting...");
        this.conn = this.peer!.connect(`tb-${code.toUpperCase()}`);
        this.conn.on("open", () => {
          this.setupConnection();
          resolve();
        });
        this.conn.on("error", reject);
      });

      this.peer.on("error", reject);
    });
  }

  async connectToPeer(peerId: string): Promise<void> {
    await this.ensureIce();
    this.onStatus?.("Connecting...");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timed out"));
      }, CONNECTION_TIMEOUT);

      if (!this.peer) {
        this.peer = createPeerWithIce(this.iceServers);
        this.peer.on("open", () => {
          this.conn = this.peer!.connect(peerId);
          this.conn.on("open", () => {
            clearTimeout(timeout);
            this.setupConnection();
            resolve();
          });
          this.conn.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        this.peer.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      } else {
        this.conn = this.peer.connect(peerId);
        this.conn.on("open", () => {
          clearTimeout(timeout);
          this.setupConnection();
          resolve();
        });
        this.conn.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }
    });
  }

  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  async initPeer(): Promise<string> {
    await this.ensureIce();

    return new Promise((resolve, reject) => {
      this.peer = createPeerWithIce(this.iceServers);
      this.peer.on("open", (id) => {
        this.peer!.on("connection", (conn) => {
          this.conn = conn;
          if (conn.open) {
            this.setupConnection();
          } else {
            conn.on("open", () => this.setupConnection());
          }
        });
        resolve(id);
      });
      this.peer.on("error", reject);
    });
  }

  send(msg: Message): void {
    if (this.conn?.open) {
      this.conn.send(encodeMessage(msg));
    }
  }

  destroy(): void {
    this.conn?.close();
    this.peer?.destroy();
    this.conn = null;
    this.peer = null;
  }

  private setupConnection(): void {
    if (!this.conn) return;
    this.onStatus?.("Connected!");

    this.conn.on("data", (data) => {
      const msg = decodeMessage(data as string);
      if (msg) this.onMessage?.(msg);
    });

    this.conn.on("close", () => {
      this.onDisconnect?.();
    });
  }

  private generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
