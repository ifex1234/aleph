"use client";

import { useEffect } from "react";
import { trackEvent } from "../_lib/analytics";

export function TrackVisit() {
  useEffect(() => {
    trackEvent("visit");
  }, []);
  return null;
}
