import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {FinalFilm} from './FinalFilm';
import timeline from './revised-timeline.json';
registerRoot(()=> <Composition id="RepeatAIWorkflow" component={()=> <FinalFilm edit={timeline} audio="workflow/revised/mix.wav"/>} width={1920} height={1080} fps={30} durationInFrames={timeline.frames}/>);
