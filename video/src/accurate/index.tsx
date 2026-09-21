import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {AccurateFilm} from './AccurateFilm';
registerRoot(() => <Composition id="RepeatAIAccurate" component={AccurateFilm} width={1920} height={1080} fps={30} durationInFrames={3690}/>);
