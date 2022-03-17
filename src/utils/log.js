import * as log from "loglevel";

const getHeader = () => `${new Date().toISOString()} | metrics`;
const format = (header, module, message) => `${header} | ${module} | ${message}`;

log.setDefaultLevel(log.levels.TRACE);

export const setVerboseLog = (shouldHaveVerboseLog) => {
  log.info(format(getHeader(), "log         ", `set log level to ${shouldHaveVerboseLog ? "verbose" : "info"}`));
  log.setLevel(shouldHaveVerboseLog ? log.levels.TRACE : log.levels.INFO);
};

export const setLogLevel = (logLevel) => {
  const levels = [...Object.keys(log.levels)];
  if (levels.includes(logLevel)) {
    log.info(format(getHeader(), "log         ", `update log level to ${logLevel.toLowerCase()}`));
    log.setLevel(logLevel);
  } else {
    log.warn(format(getHeader(), "log         ", "Incorrect log level please choose one of "), levels);
  }
};

export const debug = (name, message, data) => {
  if (data) {
    log.debug(format(getHeader(), name, message), data);
  } else {
    log.debug(format(getHeader(), name, message));
  }
};

export const trace = (name, message) => {
  log.info(format(getHeader(), name, message));
};

export const info = (name, message) => {
  log.info(format(getHeader(), name, message));
};

export const warn = (name, message) => {
  log.warn(format(getHeader(), name, message));
};

export const error = (name, message) => {
  log.error(format(getHeader(), name, message));
};
