import type {
  CollaborationConnectionState,
  CollaborationTransport,
  CollaborationTransportListener,
  CollaborationTransportMessage,
  ConnectionStateListener,
} from "./types";

const CHANNEL_PREFIX =
  "playground-collaboration";

export class BroadcastChannelTransport
  implements CollaborationTransport
{
  private channel:
    | BroadcastChannel
    | null = null;

  private sessionId:
    | string
    | null = null;

  private connectionState:
    CollaborationConnectionState =
      "idle";

  private readonly messageListeners =
    new Set<
      CollaborationTransportListener
    >();

  private readonly connectionListeners =
    new Set<
      ConnectionStateListener
    >();

  async connect(
    sessionId: string,
  ): Promise<void> {
    if (
      this.channel &&
      this.sessionId === sessionId &&
      this.connectionState === "connected"
    ) {
      return;
    }

    await this.disconnect();

    this.setConnectionState(
      "connecting",
    );

    this.sessionId = sessionId;

    if (
      typeof window === "undefined" ||
      !("BroadcastChannel" in window)
    ) {
      this.setConnectionState("error");

      throw new Error(
        "BroadcastChannel is unavailable.",
      );
    }

    try {
      this.channel =
        new BroadcastChannel(
          `${CHANNEL_PREFIX}:${sessionId}`,
        );

      this.channel.onmessage = (
        event: MessageEvent<
          CollaborationTransportMessage
        >,
      ) => {
        const message = event.data;

        if (
          !message ||
          message.sessionId !==
            this.sessionId
        ) {
          return;
        }

        this.messageListeners.forEach(
          (listener) => {
            listener(message);
          },
        );
      };

      this.channel.onmessageerror =
        () => {
          this.setConnectionState(
            "error",
          );
        };

      this.setConnectionState(
        "connected",
      );
    } catch (error) {
      this.channel = null;

      this.setConnectionState(
        "error",
      );

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.sessionId = null;

    if (
      this.connectionState !== "idle"
    ) {
      this.setConnectionState(
        "disconnected",
      );
    }
  }

  send(
    message: CollaborationTransportMessage,
  ): void {
    if (
      !this.channel ||
      this.connectionState !==
        "connected"
    ) {
      return;
    }

    this.channel.postMessage(message);
  }

  subscribe(
    listener:
      CollaborationTransportListener,
  ): () => void {
    this.messageListeners.add(
      listener,
    );

    return () => {
      this.messageListeners.delete(
        listener,
      );
    };
  }

  subscribeToConnectionState(
    listener:
      ConnectionStateListener,
  ): () => void {
    this.connectionListeners.add(
      listener,
    );

    listener(this.connectionState);

    return () => {
      this.connectionListeners.delete(
        listener,
      );
    };
  }

  getConnectionState():
    CollaborationConnectionState {
    return this.connectionState;
  }

  private setConnectionState(
    state:
      CollaborationConnectionState,
  ): void {
    if (
      this.connectionState === state
    ) {
      return;
    }

    this.connectionState = state;

    this.connectionListeners.forEach(
      (listener) => {
        listener(state);
      },
    );
  }
}
