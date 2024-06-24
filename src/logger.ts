import moment from "moment";
import * as fs from "fs";
import * as path from "path";
import { APP_CONSTANTS } from "./constants/app.constants";
import {
  LoggerOptions,
  CustomColors,
  Labels,
  FgColors,
  BgColors,
} from "./interfaces/interface";

class Logger {
  private logDirectory: string;
  private logFile: string;
  private logStream: fs.WriteStream;
  private labels: Labels;
  private fgColors: FgColors;
  private bgColors: BgColors;
  private logRotationInterval: number;

  constructor(options: LoggerOptions = {}) {
    const {
      logRotationInterval = 24 * 60 * 60 * 1000, // default 24 hours
      customLabels = {},
      customColors = {},
    } = options;

    this.logDirectory = path.join(this.findProjectRoot(), "logs");
    const filename = moment().format("DD-MM-YYYY") + ".log";
    this.logFile = path.join(this.logDirectory, filename);

    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    this.logStream = this.createLogFile();
    this.labels = { ...this.defaultLabels(), ...customLabels };
    this.fgColors = { ...this.defaultFgColors(), ...customColors.fgColors };
    this.bgColors = { ...this.defaultBgColors(), ...customColors.bgColors };
    this.logRotationInterval = logRotationInterval;

    this.scheduleLogRotation();
  }

  private defaultLabels(): Labels {
    return {
      error: "error",
      warn: "warn",
      info: "info",
      success: "success",
      notify: "notify",
      alert: "alert",
      normalize: "normalize",
    };
  }

  private defaultFgColors(): FgColors {
    return {
      FgRed: APP_CONSTANTS.CONSOLE_COLORS.FgRed,
      FgMagenta: APP_CONSTANTS.CONSOLE_COLORS.FgMagenta,
      FgBlue: APP_CONSTANTS.CONSOLE_COLORS.FgBlue,
      FgGreen: APP_CONSTANTS.CONSOLE_COLORS.FgGreen,
      FgCyan: APP_CONSTANTS.CONSOLE_COLORS.FgCyan,
      FgYellow: APP_CONSTANTS.CONSOLE_COLORS.FgYellow,
      FgWhite: APP_CONSTANTS.CONSOLE_COLORS.FgWhite,
    };
  }

  private defaultBgColors(): BgColors {
    return {
      BgRed: APP_CONSTANTS.CONSOLE_COLORS.BgRed,
      BgMagenta: APP_CONSTANTS.CONSOLE_COLORS.BgMagenta,
      BgBlue: APP_CONSTANTS.CONSOLE_COLORS.BgBlue,
      BgGreen: APP_CONSTANTS.CONSOLE_COLORS.BgGreen,
      BgCyan: APP_CONSTANTS.CONSOLE_COLORS.BgCyan,
      BgYellow: APP_CONSTANTS.CONSOLE_COLORS.BgYellow,
      BgWhite: APP_CONSTANTS.CONSOLE_COLORS.BgWhite,
    };
  }

  private getCallerName() {
    const error = new Error();
    const stackLines = error.stack?.split("\n") || [];
    const callerLine = stackLines[4]?.trim();
    if (!callerLine) return "Unknown";
    const matches = callerLine.match(/at\s+(.*?)\s+\(/);
    if (matches && matches.length >= 2) {
      return `${callerLine}`;
    }
    return "Unknown";
  }

  private findProjectRoot() {
    let currentDir = __dirname;
    while (!fs.existsSync(path.join(currentDir, "package.json"))) {
      currentDir = path.resolve(currentDir, "..");
    }
    return currentDir;
  }

  private createLogFile() {
    return fs.createWriteStream(this.logFile, { flags: "a" });
  }

  private scheduleLogRotation() {
    setInterval(() => this.rotateLogFile(), this.logRotationInterval);
  }

  private rotateLogFile() {
    this.logStream.end();
    fs.unlink(this.logFile, (err) => {
      if (err) {
        console.error(this.bgColors.error, "Error deleting log file:", err);
      } else {
        this.logStream = this.createLogFile();
        console.log(this.bgColors.info, "Log file rotated successfully.");
      }
    });
  }

  private log(label: string, message: any) {
    const functionName = this.getCallerName();
    console.log(
      this.fgColors[label],
      `[${moment().format()}] [${label}] [Function ${functionName}] :`,
      message
    );
    if (typeof message === "object") {
      message = JSON.stringify(message);
    }
    const formattedMessage = `${moment().format()} [${label}] [Function ${functionName}] : ${message}\n`;
    this.logStream.write(formattedMessage);
  }

  public error(message: any) {
    this.log(this.labels.error, message);
  }

  public warn(message: any) {
    this.log(this.labels.warn, message);
  }

  public info(message: any) {
    this.log(this.labels.info, message);
  }

  public success(message: any) {
    this.log(this.labels.success, message);
  }

  public notify(message: any) {
    this.log(this.labels.notify, message);
  }

  public alert(message: any) {
    this.log(this.labels.alert, message);
  }

  public normalize(message: any) {
    this.log(this.labels.normalize, message);
  }
}

export default Logger;
