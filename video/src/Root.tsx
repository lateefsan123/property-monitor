import { Composition } from "remotion";
import { RepeatAIConnectedFilm } from "./RepeatAIConnectedFilm";
import { RepeatAIReferenceOpening } from "./RepeatAIReferenceOpening";
import { RepeatAICleanProductFilm } from "./RepeatAICleanProductFilm";
import { RepeatAIProductFilm } from "./RepeatAIProductFilm";
import { RepeatAIStoryboardBoard, RepeatAIStoryboardFrame } from "./RepeatAIStoryboard";
import { RepeatAIAnimatedExplainer } from "./RepeatAIAnimatedExplainer";
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
      <Composition id="RepeatAIConnectedFilm" component={RepeatAIConnectedFilm} durationInFrames={1260} fps={30} width={1920} height={1080} />
      <Composition id="RepeatAIReferenceOpening" component={RepeatAIReferenceOpening} durationInFrames={360} fps={30} width={1920} height={1080} />
      <Composition id="RepeatAICleanProductFilm" component={RepeatAICleanProductFilm} durationInFrames={1440} fps={30} width={1920} height={1080} />
      <Composition id="RepeatAIProductFilm" component={RepeatAIProductFilm} durationInFrames={1440} fps={30} width={1920} height={1080} />
      <Composition id="RepeatAIStoryboardBoard" component={RepeatAIStoryboardBoard} durationInFrames={1} fps={30} width={2320} height={3540} />
      <Composition id="RepeatAIStoryboardFrame" component={RepeatAIStoryboardFrame} durationInFrames={8} fps={30} width={960} height={540} />
      <Composition id="RepeatAIAnimatedExplainer" component={RepeatAIAnimatedExplainer} durationInFrames={1080} fps={30} width={1920} height={1080} />
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
