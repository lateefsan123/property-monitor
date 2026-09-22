import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {WorkflowFilm} from './WorkflowFilm';
registerRoot(()=> <Composition id="RepeatAIWorkflow" component={WorkflowFilm} width={1920} height={1080} fps={30} durationInFrames={4230}/>);
