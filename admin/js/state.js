/**
 * Content loaded from GitHub while the admin panel is unlocked.
 * The decrypted token only lives in memory in this object.
 */
export const state = {
  token: "",
  fileShas: new Map(),
  site: null,
  projectIndex: [],
  projects: [],
  selectedProject: "",
  skills: [],
  experiments: [],
  gallery: [],
};
