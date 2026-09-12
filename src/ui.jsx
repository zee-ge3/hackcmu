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
