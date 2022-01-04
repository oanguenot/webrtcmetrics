import { defaultConfig, getLibName, getVersion } from "./helper";
import { warn } from "./log";

const _cfg = defaultConfig;

const moduleName = "config      ";

export const getConfig = (cfg) => {
  if (!cfg.pname) {
    warn(moduleName, `Argument [String] 'cfg.pname' for the peerConnection name or id is missing - use generated '${_cfg.pname}'`);
  }

  if (!cfg.refreshEvery) {
    warn(moduleName, `Argument [Int] 'cfg.refreshEvery' for the timer is missing - use default '${_cfg.refreshEvery}'`);
    if (cfg.refreshTimer) {
      warn(moduleName, "Argument [Int] 'cfg.refreshTimer' is deprecated - use [Int] 'cfg.refreshEvery'");
    }
  }

  if (!cfg.cid) {
    warn(moduleName, `Argument [String] 'cfg.cid' for the call name or id is missing - use generated '${_cfg.cid}'`);
  }

  if (!cfg.uid) {
    warn(moduleName, `Argument [String] 'cfg.uid' for the user name or id is missing - use generated '${_cfg.uid}'`);
  }

  if (!cfg.startAfter) {
    warn(moduleName, `Argument [Int] 'cfg.startAfter' for delaying grabbing the stats is missing - use default '${_cfg.startAfter}'`);
  }

  if (!cfg.stopAfter) {
    warn(moduleName, `Argument [Int] 'cfg.stopAfter' for automatically stop grabbing the stats - use default '${_cfg.stopAfter}'`);
  }

  const config = { ..._cfg, ...cfg };

  if (!cfg.refreshEvery && cfg.refreshTimer) {
    config.refreshEvery = cfg.refreshTimer;
  }
  config.name = getLibName();
  config.version = getVersion();

  return config;
};

export const getGlobalConfig = () => ({
  name: getLibName(),
  version: getVersion(),
});
