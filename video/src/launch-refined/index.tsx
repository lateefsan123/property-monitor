import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {RefinedFilm} from './Film';
import timeline from './timeline.json';
registerRoot(()=> <Composition id="RepeatAIRefined" component={RefinedFilm} width={1920} height={1080} fps={30} durationInFrames={timeline.frames}/>);
