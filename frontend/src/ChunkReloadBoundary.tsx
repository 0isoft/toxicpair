// src/ChunkReloadBoundary.tsx
import React from "react";

export default class ChunkReloadBoundary extends React.Component<
  { children: React.ReactNode }, { retried: boolean }
> {
  state = { retried: false };

  componentDidCatch(error: any) {
    const m = String(error?.message || error || "");
    const isChunk = /Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk \d+ failed|imported module/i.test(m);
    if (isChunk && !this.state.retried) {
      this.setState({ retried: true }, () => {
        sessionStorage.setItem("chunk-reloaded", "1");
        location.reload();
      });
    }
  }

  render() {
    return <>{this.props.children}</>;
  }
}
