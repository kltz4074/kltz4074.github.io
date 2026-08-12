/**
 * Repository target and security/upload limits.
 * GitHub rejects individual files larger than 100 MiB.
 */
export const CONFIG = Object.freeze({
  owner: "kltz4074",
  repo: "kltz4074.github.io",
  branch: "main",
  apiRoot: "https://api.github.com",
  vaultKey: "kltzqu-admin-v1",
  iterations: 600000,
  maxImageUploadBytes: 25 * 1024 * 1024,
  maxVideoUploadBytes: 100 * 1024 * 1024,
});
