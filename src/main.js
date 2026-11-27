import '../styles.css';
import { createManifestoScene } from './scene.js';
import { initApp } from './app.js';
import { initSimulator } from './simulator.js';

const ManifestoScene = createManifestoScene();
initApp(ManifestoScene);
initSimulator(ManifestoScene);
