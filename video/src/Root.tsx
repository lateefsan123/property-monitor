import { Composition } from "remotion";
import { SellerSignalVideo, FPS, DURATION_IN_FRAMES, WIDTH, HEIGHT } from "./SellerSignalVideo";

export const Root: React.FC = () => {
  return (
    <Composition
      id="SellerSignal"
      component={SellerSignalVideo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
