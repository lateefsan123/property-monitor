import { Composition } from "remotion";
import { SellerSignalVideo, FPS, DURATION_IN_FRAMES, WIDTH, HEIGHT } from "./SellerSignalVideo";
import {
  RepeatAIExplainer,
  REPEAT_AI_DURATION_IN_FRAMES,
} from "./RepeatAIExplainer";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SellerSignal"
        component={SellerSignalVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="RepeatAIExplainer"
        component={RepeatAIExplainer}
        durationInFrames={REPEAT_AI_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
