import React from "react";
import { useAuth } from "../lib/auth";

export default function BootGate({ children }: { children: React.ReactNode }) {
  const { booted } = useAuth();
  if (!booted) {
    return (
      <div id="boot-splash"
           style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}