import React, { useState } from "react";

// Generalizes the loading/error try-catch-finally pattern that setup screens
// and the profile page each used to hand-roll separately.
export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = async (task) => {
    setLoading(true);
    setError("");
    try {
      return await task();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return { loading, error, setError, run };
}

export function PageHead({ icon: Icon, title, subtitle, children }) {
  return (
    <header className="page-head">
      {Icon && (
        <span className="page-head-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      <div className="page-head-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-head-extra">{children}</div>}
    </header>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="error" role="alert">
      {error}
    </div>
  );
}

export function ListSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </>
  );
}
