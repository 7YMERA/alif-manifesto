import '../styles.css';
import { createManifestoScene } from './scene.js';
import { initApp } from './app.js';
import { initWhimsy } from './whimsy.js';
import { initSimulator } from './simulator.js';

const ManifestoScene = createManifestoScene();
initApp(ManifestoScene);
initWhimsy();
initSimulator(ManifestoScene);
