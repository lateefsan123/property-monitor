import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {LaunchFilm} from './LaunchFilm';
import timeline from './timeline.json';
registerRoot(()=> <Composition id="RepeatAILaunch" component={LaunchFilm} width={1920} height={1080} fps={30} durationInFrames={timeline.frames}/>);
