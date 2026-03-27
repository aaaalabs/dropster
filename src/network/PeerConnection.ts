import Peer, { DataConnection } from "peerjs";
import { Message, encodeMessage, decodeMessage } from "./Protocol";

export type ConnectionCallback = (msg: Message) => void;
export type StatusCallback = (status: string) => void;

export class PeerConnection {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onMessage: ConnectionCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private onDisconnect: (() => void) | null = null;

  setHandlers(handlers: {
    onMessage: ConnectionCallback;
    onStatus: StatusCallback;
    onDisconnect: () => void;
  }): void {
    this.onMessage = handlers.onMessage;
    this.onStatus = handlers.onStatus;
    this.onDisconnect = handlers.onDisconnect;
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

  connectToPeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        this.peer = new Peer();
        this.peer.on("open", () => {
          this.conn = this.peer!.connect(peerId);
          this.conn.on("open", () => {
            this.setupConnection();
            resolve();
          });
          this.conn.on("error", reject);
        });
        this.peer.on("error", reject);
      } else {
        this.conn = this.peer.connect(peerId);
        this.conn.on("open", () => {
          this.setupConnection();
          resolve();
        });
        this.conn.on("error", reject);
      }
    });
  }

  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  initPeer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();
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
