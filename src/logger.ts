import moment from "moment";
import * as fs from "fs";
import * as path from "path";
import {
  AnsiColorResult,
  COLOR,
  Logger,
  LoggerOptions,
  MAPPED_LABEL,
  RGBColor,
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
    error: "RED",
    warning: "YELLOW",
    info: "CYAN",
    success: "GREEN",
    log: "WHITE",
    notify: "BLUE",
    alert: "YELLOWBG",
    critical: "REDBG",
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
    this.options = options || ({} as LoggerOptions);
    this.checkOptions(this.options);
  }

  /**
   * Checks and sets the provided options.
   * @private
   * @param {LoggerOptions} options - Logger options.
   * @returns {void}
   */
  private checkOptions(options: LoggerOptions): void {
    if (options.saveLogFile) {
      if (
        this.isItBrowser() && !this.isItNode()
      ) {
        console.log("%c Log File Save Option is not available for browser.","background:red;");
      } else {
        this.setLogDirectoryAndFile(options);
        if (!fs.existsSync(this.logDirectory)) {
          fs.mkdirSync(this.logDirectory, { recursive: true });
        }
        this.createLogStream(options);
      }
    }
    if (options.customLabels && options.customLabels.length) {
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
    const filename =
      options.logFileName || moment().format("DD-MM-YYYY") + ".log";
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
      if(!label.label || !label.color ) return;
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
      this.logger[key] = (message: any) => this.log(key, message);
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
    const callerLine = stackLines[5]?.trim();
    if (!callerLine) return "Unknown";
    const matches = callerLine.match(/at\s+(.*?)\s+\(/);
    return matches && matches.length >= 2 ? callerLine : "Unknown";
  }

  /**
   * Logs a message with the specified label.
   * @private
   * @param {string} label - The log level label.
   * @param {any} message - The message to log.
   * @returns {void}
   */
  private log(label: string, message: any): void {
    const formattedMessage = this.formatMessage(label, message);
    const mappedLabelColor = this.MAPPED_LABEL[label];

    if (this.isItBrowser() && !this.isItNode()) {
      this.logToBrowser(formattedMessage, mappedLabelColor, message);
    } else if (!this.isItBrowser() && this.isItNode()) {
      this.logToNode(formattedMessage, mappedLabelColor, message);
      this.options.saveLogFile && this.saveToFile(formattedMessage, message);
    } else {
      console.log(formattedMessage, message);
      this.options.saveLogFile && this.saveToFile(formattedMessage, message);
    }
  }

  /**
   * give formatted message according to options
   * @private
   * @param label
   * @param message
   * @returns {string}
   */
  private formatMessage(label: string, message: any): string {
    let formattedMessage = "";
    if (this.options.printTimestamp)
      formattedMessage += `[${moment().format()}] `;
    if (this.options.printLabelName)
      formattedMessage += `[${label.toUpperCase()}] `;
    if (this.options.printCallerFunctionLocation)
      formattedMessage += `[Function ${this.getCallerName()}] `;
    if (
      this.options.printTimestamp ||
      this.options.printCallerFunctionLocation ||
      this.options.printLabelName
    ) {
      formattedMessage += ": ";
    }
    return formattedMessage;
  }

  /**
   * log for browser console
   * @private
   * @param formattedMessage
   * @param mappedLabelColor
   * @param message
   * @returns {void}
   */
  private logToBrowser(
    formattedMessage: string,
    mappedLabelColor: COLOR,
    message: any
  ): void {
    const decidedColor = this.getColorStringForBrowser(mappedLabelColor);
    console.log(`%c ${formattedMessage} ${message}`, decidedColor);
  }

  /**
   * log for node console
   * @private
   * @param formattedMessage
   * @param mappedLabelColor
   * @param message
   * @returns {void}
   */
  private logToNode(
    formattedMessage: string,
    mappedLabelColor: COLOR,
    message: any
  ): void {
    const decidedColor = this.getColorStringForNode(mappedLabelColor);
    console.log(decidedColor, formattedMessage, message, Color.RESET);
  }

  /**
   * @private
   * @param formattedMessage
   * @param message
   * @returns {void}
   */
  private saveToFile(formattedMessage: string, message: any): void {
    const stringifiedMessage =
      typeof message === "object" ? JSON.stringify(message) : message;
    this.logStream.write(`${formattedMessage} ${stringifiedMessage}\n`);
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
      if (
        this.logStream.bytesWritten >
        (options.logRotationInterval || this.logRotationInterval)
      ) {
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
  /**
   * Retrieves the color string suitable for browser console styling based on the provided color configuration.
   * Converts ANSI escape sequences to RGB format if necessary.
   * @private
   * @param {COLOR} mappedLabelColor - The color configuration for the label.
   * @returns {string} The CSS style string for setting text color in the browser console.
   */
  private getColorStringForBrowser(mappedLabelColor: COLOR): string {
    if (
      typeof mappedLabelColor === "object" &&
      "ansiCode" in mappedLabelColor
    ) {
      const ansiToRgbResult = this.ansiEscapeToRgb(mappedLabelColor.ansiCode);
      return `${ansiToRgbResult.isBackground ? 'background': 'color'}: rgb(${ansiToRgbResult.color.R}, ${ansiToRgbResult.color.G}, ${ansiToRgbResult.color.B});`;
    } else if (typeof mappedLabelColor === "object") {
      return `${mappedLabelColor.isBackground ? 'background': 'color'}: rgb(${mappedLabelColor.R}, ${mappedLabelColor.G}, ${mappedLabelColor.B});`;
    } else {
      const ansiToRgbResult = this.ansiEscapeToRgb(Color[mappedLabelColor]);
      return `${ansiToRgbResult.isBackground ? 'background': 'color'}: rgb(${ansiToRgbResult.color.R}, ${ansiToRgbResult.color.G}, ${ansiToRgbResult.color.B});`;
    }
  }

  /**
   * Retrieves the ANSI escape sequence or color code suitable for Node.js console styling based on the provided color configuration.
   * Converts RGB colors to ANSI escape sequences if necessary.
   * @private
   * @param {COLOR} mappedLabelColor - The color configuration for the label.
   * @returns {string} The ANSI escape sequence or color code for setting text color in the Node.js console.
   */
  private getColorStringForNode(mappedLabelColor: COLOR): string {
    if (
      typeof mappedLabelColor === "object" &&
      "ansiCode" in mappedLabelColor
    ) {
      return `${mappedLabelColor.ansiCode}`;
    } else if (typeof mappedLabelColor === "object") {
      return `${
        mappedLabelColor.isBackground
          ? `\x1b[48;2;${mappedLabelColor.R};${mappedLabelColor.G};${mappedLabelColor.B}m`
          : `\x1b[38;2;${mappedLabelColor.R};${mappedLabelColor.G};${mappedLabelColor.B}m`
      }`;
    } else {
      return `${Color[mappedLabelColor]}`;
    }
  }

  /**
   * Converts an 8-bit ANSI color code to an RGB value.
   * @private
   * @param {number} code - The 8-bit ANSI color code.
   * @returns {RGBColor} The RGB value as an object {R, G, B}.
   */
  private ansiToRgb(code: number): RGBColor {
    if (code < 16) {
      const baseColors: RGBColor[] = [
        { R: 0, G: 0, B: 0 },
        { R: 128, G: 0, B: 0 },
        { R: 0, G: 128, B: 0 },
        { R: 128, G: 128, B: 0 },
        { R: 0, G: 0, B: 128 },
        { R: 128, G: 0, B: 128 },
        { R: 0, G: 128, B: 128 },
        { R: 192, G: 192, B: 192 },
        { R: 128, G: 128, B: 128 },
        { R: 255, G: 0, B: 0 },
        { R: 0, G: 255, B: 0 },
        { R: 255, G: 255, B: 0 },
        { R: 0, G: 0, B: 255 },
        { R: 255, G: 0, B: 255 },
        { R: 0, G: 255, B: 255 },
        { R: 255, G: 255, B: 255 },
      ];
      return baseColors[code];
    } else if (code < 232) {
      code -= 16;
      const r = Math.floor(code / 36) * 51;
      const g = Math.floor((code % 36) / 6) * 51;
      const b = (code % 6) * 51;
      return { R: r, G: g, B: b };
    } else if (code < 256) {
      const gray = Math.round((code - 232) * 10 + 8);
      return { R: gray, G: gray, B: gray };
    } else {
      throw new Error("Invalid ANSI color code");
    }
  }

  /**
   * Finds the closest ANSI color code to the given RGB value.
   * @private
   * @param {RGBColor} color - The RGB color object {R, G, B}.
   * @returns {number} The closest 8-bit ANSI color code.
   */
  private rgbToAnsi(color: RGBColor): number {
    const ansiColors: RGBColor[] = [];
    for (let i = 0; i < 256; i++) {
      ansiColors.push(this.ansiToRgb(i));
    }

    let closestIndex = 0;
    let smallestDistance = Number.MAX_VALUE;

    for (let i = 0; i < ansiColors.length; i++) {
      const ansiColor = ansiColors[i];
      const distance = Math.sqrt(
        Math.pow(ansiColor.R - color.R, 2) +
          Math.pow(ansiColor.G - color.G, 2) +
          Math.pow(ansiColor.B - color.B, 2)
      );

      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  /**
   * Extracts the ANSI color code from an escape sequence and converts it to RGB.
   * @private
   * @param {string} ansi - The ANSI escape sequence.
   * @returns {AnsiColorResult} An object containing the RGB value and background flag.
   */
  private ansiEscapeToRgb(ansi: string): AnsiColorResult {
    const regex = /\x1b\[(\d+)(;\d+)?(;\d+)*m/;
    const match = ansi.match(regex);
    if (match) {
      const codesString = match.slice(1).filter(Boolean).join('');
      const codes = codesString.split(';').map(Number);

      if (codes.length === 1) {
        const code = codes[0];
        if (code >= 30 && code <= 37) {
          return { color: this.ansiToRgb(code - 30), isBackground: false };
        } else if (code >= 40 && code <= 47) {
          return { color: this.ansiToRgb(code - 40), isBackground: true };
        }
      }

      if (
        codes.length === 3 &&
        (codes[0] === 38 || codes[0] === 48) &&
        codes[1] === 5
      ) {
        return {
          color: this.ansiToRgb(codes[2]),
          isBackground: codes[0] === 48,
        };
      }

      throw new Error("Unsupported ANSI escape sequence");
    } else {
      throw new Error("Invalid ANSI escape sequence");
    }
  }

  /**
   * Check if it is Browser Environment
   * @private
   * @returns {boolean}
   */
  private isItBrowser(): boolean {
    return (
      typeof window !== "undefined" && typeof window.document !== "undefined"
    );
  }

  /**
   * Check if it is Node Environment
   * @private
   * @returns {boolean}
   */
  private isItNode(): boolean {
    return (
      typeof (
        typeof process !== "undefined" &&
        process.versions &&
        process.versions.node
      ) == "string"
    );
  }
}
