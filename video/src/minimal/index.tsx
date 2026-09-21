import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {MinimalFilm} from './MinimalFilm';

const MinimalRoot = () => <Composition id="RepeatAIMinimal" component={MinimalFilm} width={1920} height={1080} fps={30} durationInFrames={2010}/>;
registerRoot(MinimalRoot);
