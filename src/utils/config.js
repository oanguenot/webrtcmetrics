import { defaultConfig, getLibName, getVersion } from "./models";
import { warn } from "./log";

const moduleName = "config      ";

export const getConfig = (peerConnection, cfg = {}, globalConfig) => {
  const config = { ...globalConfig, ...cfg };

  if (!cfg.pname) {
    warn(moduleName, `Argument [String] 'cfg.pname' for the peerConnection name or id is missing - use generated '${globalConfig.pname}'`);
  }

  if (!cfg.cid) {
    warn(moduleName, `Argument [String] 'cfg.cid' for the call name or id is missing - use generated '${globalConfig.cid}'`);
  }

  if (!cfg.uid) {
    warn(moduleName, `Argument [String] 'cfg.uid' for the user name or id is missing - use generated '${globalConfig.uid}'`);
  }

  config.pc = peerConnection;
  return config;
};

export const getGlobalConfig = (cfg = {}) => {
  const config = { ...defaultConfig, ...cfg };
  config.name = getLibName();
  config.version = getVersion();
  return config;
};
