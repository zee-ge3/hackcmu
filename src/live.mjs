export class LiveConnection {
  constructor({ onStatus, onEvent, onError, greeting }) {
    Object.assign(this, { onStatus, onEvent, onError, greeting });
    this.ready = false;
    this.closed = false;
    this.pendingAppends = new Set();
  }
  send(type, content, delegationId = null) {
    if (!this.ready || this.events?.readyState !== "open") return false;
    if (this.closing && type !== "session.close") return false;
    const eventId = crypto.randomUUID();
    if (type.endsWith(".append")) this.pendingAppends.add(eventId);
    this.events.send(
      JSON.stringify({
        type,
        event_id: eventId,
        ...(content === undefined
          ? {}
          : { content, delegation_id: delegationId }),
      }),
    );
    return eventId;
  }
  async connect(url) {
    this.onStatus("connecting");
    try {
      this.peer = new RTCPeerConnection();
      this.audio = new Audio();
      this.audio.autoplay = true;
      this.peer.ontrack = (e) => {
        this.audio.srcObject = new MediaStream([e.track]);
        this.audio
          .play()
          .catch(() =>
            this.onError("Audio playback was blocked. Use Play audio."),
          );
      };
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (this.closed) {
        this.cleanup();
        return;
      }
      this.mic.getTracks().forEach((t) => this.peer.addTrack(t, this.mic));
      this.events = this.peer.createDataChannel("oai-events");
      this.events.onmessage = ({ data }) => {
        let e;
        try {
          e = JSON.parse(data);
        } catch {
          return;
        }
        if (e.type === "session.started") {
          clearTimeout(this.startTimeout);
          this.ready = true;
          this.onStatus("live");
          this.greetingId = this.send(
            "session.instructions.append",
            this.greeting ||
              "Greet the candidate immediately now, following the configured interviewer style and instructions. Briefly introduce yourself as their AI interviewer, introduce the session, and ask them to read the current problem and explain their initial approach. Do not wait for them to speak first. Then pause and listen.",
          );
        }
        if (
          e.type === "session.instructions.appended" &&
          e.client_event_id === this.greetingId
        ) {
          this.greetingId = null;
          this.send(
            "session.commentary.append",
            "Begin the conversation now, following the instructions provided.",
          );
        }
        if (e.type.endsWith(".appended") || e.type === "error") {
          this.pendingAppends.delete(
            e.client_event_id || e.error?.client_event_id,
          );
          if (this.pendingAppends.size === 0) this.onAppendsDrained?.();
        }
        const expectedCloseCancellation =
          this.closing &&
          e.type === "error" &&
          e.error?.message
            ?.toLowerCase()
            .includes(
              "session closed before the estimated context injection completed",
            );
        if (e.type === "error" && !expectedCloseCancellation)
          this.onError(e.error?.message || "Voice command failed");
        this.onEvent(e);
        if (e.type === "session.closed") {
          this.finalized = true;
          this.cleanup();
          this.onStatus("ended");
        }
      };
      this.events.onclose = () => {
        if (!this.closed) {
          this.cleanup();
          this.onStatus("disconnected");
          this.onError(
            "Voice disconnected; final usage is unconfirmed. You can reconnect.",
          );
        }
      };
      this.peer.onconnectionstatechange = () => {
        if (this.peer?.connectionState === "failed") {
          this.cleanup();
          this.onStatus("disconnected");
          this.onError("Voice connection failed. Your code is saved.");
        }
      };
      await this.peer.setLocalDescription(await this.peer.createOffer());
      if (this.peer.iceGatheringState !== "complete")
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            this.peer?.removeEventListener("icegatheringstatechange", check);
            reject(new Error("Connection setup timed out."));
          }, 10000);
          const check = () => {
            if (this.peer?.iceGatheringState === "complete") {
              clearTimeout(timer);
              this.peer.removeEventListener("icegatheringstatechange", check);
              resolve();
            }
          };
          this.peer.addEventListener("icegatheringstatechange", check);
          check();
        });
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: this.peer.localDescription.sdp }),
        signal: AbortSignal.timeout(95000),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (this.closed) return;
      this.sessionId = d.session.id;
      await this.peer.setRemoteDescription({
        type: "answer",
        sdp: d.transport.sdp,
      });
      if (!this.ready)
        this.startTimeout = setTimeout(() => {
          this.cleanup();
          this.onStatus("disconnected");
          this.onError("The voice session did not start. Please reconnect.");
        }, 20000);
    } catch (e) {
      this.cleanup();
      this.onStatus("disconnected");
      this.onError(e.message);
    }
  }
  mute(value) {
    this.mic?.getAudioTracks().forEach((t) => {
      t.enabled = !value;
    });
  }
  close() {
    if (this.closePromise) return this.closePromise;
    if (!this.ready) {
      this.cleanup();
      this.onStatus("ended");
      return Promise.resolve({ finalized: !!this.finalized });
    }
    this.closePromise = new Promise((resolve) => {
      this.closeResolve = resolve;
    });
    this.closing = true;
    this.onStatus("closing");
    const closeAfterAppends = () => {
      if (this.closeSent || this.closed) return;
      this.closeSent = true;
      clearTimeout(this.drainTimeout);
      this.send("session.close");
      this.ready = false;
      this.closeTimeout = setTimeout(() => {
        this.cleanup();
        this.onStatus("ended");
        this.onError("Voice stopped, but final usage could not be confirmed.");
      }, 15000);
    };
    if (this.pendingAppends.size === 0) closeAfterAppends();
    else {
      this.onAppendsDrained = closeAfterAppends;
      this.drainTimeout = setTimeout(closeAfterAppends, 8000);
    }
    return this.closePromise;
  }
  cleanup() {
    this.closed = true;
    this.ready = false;
    this.closeResolve?.({ finalized: !!this.finalized });
    clearTimeout(this.drainTimeout);
    clearTimeout(this.closeTimeout);
    clearTimeout(this.startTimeout);
    this.mic?.getTracks().forEach((t) => t.stop());
    this.events?.close();
    this.peer?.close();
    if (this.audio) {
      this.audio.pause();
      this.audio.srcObject = null;
    }
  }
}
