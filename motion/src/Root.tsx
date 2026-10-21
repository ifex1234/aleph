import React from "react";
import { Composition } from "remotion";
import { Launch90 } from "./Launch90";
import { Launch30 } from "./Launch30";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AlephLaunch"
      component={Launch90}
      durationInFrames={2700}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="AlephLaunch30"
      component={Launch30}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
