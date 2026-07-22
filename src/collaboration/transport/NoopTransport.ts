import type {
  CollaborationConnectionState,
  CollaborationTransport,
  CollaborationTransportListener,
  CollaborationTransportMessage,
  ConnectionStateListener,
} from "./types";

export class NoopTransport
  implements CollaborationTransport
{
  private state:
    CollaborationConnectionState =
      "disconnected";

  private readonly connectionListeners =
    new Set<
      ConnectionStateListener
    >();

  async connect(
    _sessionId: string,
  ): Promise<void> {
    this.state = "disconnected";
    this.emitState();
  }

  async disconnect(): Promise<void> {
    this.state = "disconnected";
    this.emitState();
  }

  send(
    _message:
      CollaborationTransportMessage,
  ): void {
    // Intentionally empty.
  }

  subscribe(
    _listener:
      CollaborationTransportListener,
  ): () => void {
    return () => undefined;
  }

  subscribeToConnectionState(
    listener:
      ConnectionStateListener,
  ): () => void {
    this.connectionListeners.add(
      listener,
    );

    listener(this.state);

    return () => {
      this.connectionListeners.delete(
        listener,
      );
    };
  }

  getConnectionState():
    CollaborationConnectionState {
    return this.state;
  }

  private emitState(): void {
    this.connectionListeners.forEach(
      (listener) => {
        listener(this.state);
      },
    );
  }
}
