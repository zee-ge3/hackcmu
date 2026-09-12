import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "./api.mjs";
const AccountContext = createContext(null);
// Google Identity Services keeps one global config; initialize it once per client ID.
let initializedClientId = null;
export function AccountProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    googleClientId: null,
  });
  useEffect(() => {
    api("/api/me", undefined, "GET")
      .then((d) => setState({ loading: false, ...d }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);
  const value = {
    ...state,
    setUser: (user) => setState((s) => ({ ...s, user })),
    async signIn(credential) {
      const d = await api("/api/auth/google", { credential });
      setState((s) => ({ ...s, user: d.user }));
    },
    async signOut() {
      await api("/api/auth/logout", {});
      setState((s) => ({ ...s, user: null }));
    },
  };
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
export const useAccount = () => useContext(AccountContext);
// Renders Google Identity Services' button once the gsi script has loaded.
export function GoogleSignIn({ size = "large" }) {
  const { googleClientId, signIn } = useAccount();
  const slot = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!googleClientId || !slot.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setTimeout(render, 150);
        return;
      }
      if (initializedClientId !== googleClientId) {
        initializedClientId = googleClientId;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: "popup",
          callback: ({ credential }) =>
            signIn(credential).catch((e) => setError(e.message)),
        });
      }
      slot.current.replaceChildren();
      window.google.accounts.id.renderButton(slot.current, {
        theme: "outline",
        size,
        shape: "pill",
        text: "signin_with",
      });
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [googleClientId]);
  if (!googleClientId)
    return (
      <p className="upload-note">
        Google sign-in is not configured. Set GOOGLE_CLIENT_ID in .env and
        restart the server.
      </p>
    );
  return (
    <div className="google-signin">
      <div ref={slot} />
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
export function SignInGate() {
  return (
    <main className="setup signin-gate">
      <section className="card">
        <span className="eyebrow muted">SIGN IN</span>
        <h1>Your practice, saved to you.</h1>
        <p>
          Sign in with Google to keep your résumés, OpenAI key, and interview
          feedback in one profile.
        </p>
        <GoogleSignIn />
        <p className="upload-note">
          Interviews run on your own OpenAI API key. It is stored encrypted on
          this server and used only for your sessions.
        </p>
      </section>
    </main>
  );
}
