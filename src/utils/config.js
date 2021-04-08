import { defaultConfig, getLibName, getVersion } from "./helper";
import { warn } from "./log";

const _cfg = defaultConfig;

const moduleName = "config      ";

export const getConfig = (cfg) => {
  if (!cfg) {
    throw new Error("Argument [Object] 'cfg' for the configuration is missing");
  }

  if (!cfg.pc) {
    throw new Error("Argument [RTCPeerConnection] 'cfg.pc' for the peer connection is missing");
  }

  if (!cfg.pname) {
    warn(moduleName, `Argument [String] 'cfg.pname' for the peerConnection name or id is missing - use generated '${_cfg.pname}'`);
  }

  if (!cfg.refreshTimer) {
    warn(moduleName, `Argument [Int] 'cfg.refreshTimer' for the timer is missing - use default '${_cfg.refreshTimer}'`);
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

  return config;
};
