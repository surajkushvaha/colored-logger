import moment from "moment";
import * as fs from "fs";
import * as path from "path";
import {
  Logger,
  LoggerOptions,
  MAPPED_LABEL,
  customLabels,
} from "./interfaces/interface";
import { Color } from "./constants/colors";

/**
 * Class representing a logger for Node.js applications.
 * Provides various logging methods with customizable options.
 */
export default class NodeLogger {
  /**
   * Log rotation interval in milliseconds.
   * @private
   * @type {number}
   */
  private logRotationInterval: number = 24 * 60 * 60 * 1000;

  /**
   * Directory path for log files.
   * @private
   * @type {string}
   */
  private logDirectory!: string;

  /**
   * Log file path.
   * @private
   * @type {string}
   */
  private logFile!: string;

  /**
   * Write stream for the log file.
   * @private
   * @type {fs.WriteStream}
   */
  private logStream!: fs.WriteStream;

  /**
   * Mapped labels for different log levels.
   * @private
   * @type {MAPPED_LABEL}
   */
  private MAPPED_LABEL: MAPPED_LABEL = {
    ERROR: Color.RED,
    WARNING: Color.YELLOW,
    INFO: Color.CYAN,
    SUCCESS: Color.GREEN,
    LOG: Color.WHITE,
    NOTIFY: Color.BLUE,
    ALERT: Color.YELLOWBG,
    CRITICAL: Color.REDBG,
  };

  /**
   * Logger options.
   * @private
   * @type {LoggerOptions}
   */
  private options!: LoggerOptions;

  /**
   * Logger instance with various logging methods.
   * @public
   * @type {Logger}
   */
  public logger: Logger = this.createMappedLoggerFunction();

  /**
   * Creates an instance of NodeLogger.
   * @param {LoggerOptions} [options] - Logger options.
   */
  constructor(options?: LoggerOptions) {
    if (!options) {
      options = {} as LoggerOptions;
    }
    this.options = options;
    this.checkOptions(options);
  }

  /**
   * Checks and sets the provided options.
   * @private
   * @param {LoggerOptions} options - Logger options.
   * @returns {void}
   */
  private checkOptions(options: LoggerOptions): void {
    if (options.saveLogFile) {
      this.setLogDirectoryAndFile(options);
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
      this.createLogStream(options);
    }
    if (options.customLabels) {
      this.updateCustomLabels(options.customLabels);
      this.createMappedLoggerFunction();
    }
  }

  /**
   * Sets the log directory and file path based on the provided options.
   * @private
   * @param {LoggerOptions} options - Logger options.
   * @returns {void}
   */
  private setLogDirectoryAndFile(options: LoggerOptions): void {
    this.logDirectory = options.logFolderPath
      ? path.resolve(process.cwd(), options.logFolderPath)
      : path.join(process.cwd(), "logs");
    const filename = options.logFileName || moment().format("DD-MM-YYYY") + ".log";
    this.logFile = path.join(this.logDirectory, filename);
  }

  /**
   * Updates the custom labels based on the provided options.
   * @private
   * @param {customLabels[]} customLabels - Array of custom labels.
   * @returns {void}
   */
  private updateCustomLabels(customLabels: customLabels[]): void {
    customLabels.forEach((label) => {
      this.MAPPED_LABEL[label.label] = label.color;
    });
  }

  /**
   * Creates a mapped logger function for each log level.
   * @private
   * @returns {Logger}
   */
  private createMappedLoggerFunction(): Logger {
    Object.keys(this.MAPPED_LABEL).forEach((key) => {
      if (!this.logger) this.logger = {} as any;
      this.logger[key.toLowerCase()] = (message: any) => this.log(key, message);
    });
    return Object.assign(this.logger);
  }

  /**
   * Retrieves the caller function's name and location.
   * @private
   * @returns {string}
   */
  private getCallerName(): string {
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

  /**
   * Logs a message with the specified label.
   * @private
   * @param {string} label - The log level label.
   * @param {any} message - The message to log.
   * @returns {void}
   */
  private log(label: string, message: any): void {
    let formattedMessage = '';
    if (this.options.printTimestamp) formattedMessage += `[${moment().format()}] `;
    if (this.options.printCallerFunctionName) formattedMessage += `[${label}] `;
    if (this.options.printCallerFunctionLocation) formattedMessage += `[Function ${this.getCallerName()}] `;
    if (this.options.printTimestamp || this.options.printCallerFunctionLocation || this.options.printCallerFunctionName) formattedMessage += `: `;
    console.log(
      this.MAPPED_LABEL[label],
      formattedMessage,
      message,
      Color.RESET
    );
    if (this.options.saveLogFile) {
      if (typeof message === "object") {
        try {
          message = JSON.stringify(message);
        } catch (e: any) {
          console.error(e.message);
          message = 'Error: Unable to stringify object';
        }
      }
      formattedMessage = `${formattedMessage} ${message}\n`;
      this.logStream.write(formattedMessage);
    }
  }

  /**
   * Creates a write stream for the log file and sets up log rotation.
   * @private
   * @param {LoggerOptions} options - Logger options.
   * @returns {void}
   */
  private createLogStream(options: LoggerOptions): void {
    this.logStream = fs.createWriteStream(this.logFile, { flags: "a" });
    setInterval(() => {
      if (this.logStream.bytesWritten > (options.logRotationInterval || this.logRotationInterval)) {
        this.rotateLogFile();
      }
    }, options.logRotationInterval || this.logRotationInterval);
  }

  /**
   * Creates a new log file.
   * @private
   * @returns {fs.WriteStream}
   */
  private createLogFile(): fs.WriteStream {
    return fs.createWriteStream(this.logFile, { flags: "a" });
  }

  /**
   * Rotates the log file by deleting the old one and creating a new one.
   * @private
   * @returns {void}
   */
  private rotateLogFile(): void {
    this.logStream.end();
    fs.unlink(this.logFile, (err) => {
      if (err) {
        console.error(Color.RED, "Error deleting log file:", err);
      } else {
        this.logStream = this.createLogFile();
        console.log(Color.GREEN, "Log file rotated successfully.");
      }
    });
  }
}
