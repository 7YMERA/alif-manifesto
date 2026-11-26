import '../styles.css';
import { createManifestoScene } from './scene.js';
import { initApp } from './app.js';

const ManifestoScene = createManifestoScene();
initApp(ManifestoScene);
