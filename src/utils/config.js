import { defaultConfig, getLibName, getVersion } from "./helper";
import { warn } from "./log";

const _cfg = defaultConfig;

const moduleName = "config      ";

export const getConfig = (peerConnection, cfg = {}, globalConfig) => {
  if (!cfg.pname) {
    warn(moduleName, `Argument [String] 'cfg.pname' for the peerConnection name or id is missing - use generated '${_cfg.pname}'`);
  }

  if (!cfg.cid) {
    warn(moduleName, `Argument [String] 'cfg.cid' for the call name or id is missing - use generated '${_cfg.cid}'`);
  }

  if (!cfg.uid) {
    warn(moduleName, `Argument [String] 'cfg.uid' for the user name or id is missing - use generated '${_cfg.uid}'`);
  }

  const config = { ..._cfg, ...cfg };

  config.name = getLibName();
  config.version = getVersion();
  config.pc = peerConnection;
  config.refreshEvery = globalConfig.refreshEvery;
  config.startAfter = globalConfig.startAfter;
  config.stopAfter = globalConfig.stopAfter;
  return config;
};

export const getGlobalConfig = (cfg = {}) => ({
  name: getLibName(),
  version: getVersion(),
  refreshEvery: "refreshEvery" in cfg ? cfg.refreshEvery : 2000,
  startAfter: "startAfter" in cfg ? cfg.startAfter : 0,
  stopAfter: "stopAfter" in cfg ? cfg.stopAfter : 1,
});
