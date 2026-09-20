import { Composition } from "remotion";
import { RepeatAIMotionStudy } from "./RepeatAIMotionStudy";
import { RepeatAIIllustratedOpening, RepeatAIBrokerLoop } from "./RepeatAIIllustratedOpening";
import { SellerSignalVideo, FPS, DURATION_IN_FRAMES, WIDTH, HEIGHT } from "./SellerSignalVideo";
import {
  RepeatAIExplainer,
  REPEAT_AI_DURATION_IN_FRAMES,
} from "./RepeatAIExplainer";
import {
  RepeatAIExplainerV2,
  REPEAT_AI_V2_DURATION_IN_FRAMES,
} from "./RepeatAIExplainerV2";

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="RepeatAIBrokerLoop" component={RepeatAIBrokerLoop} durationInFrames={72} fps={30} width={720} height={720} />
      <Composition id="RepeatAIIllustratedOpening" component={RepeatAIIllustratedOpening} durationInFrames={450} fps={30} width={1920} height={1080} />
      <Composition id="RepeatAIMotionStudy" component={RepeatAIMotionStudy} durationInFrames={450} fps={30} width={1920} height={1080} />
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
      <Composition
        id="RepeatAIExplainerV2"
        component={RepeatAIExplainerV2}
        durationInFrames={REPEAT_AI_V2_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
