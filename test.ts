import {Logger, LoggerOptions} from './dist/index';

const options: LoggerOptions = {
  /**
   * log file save option is not supported in browser environment
   */
  logFolderPath: './logs',
  logFileName: 'app.log',
  logRotationInterval: 60000, // 1 minute
  saveLogFile: true,
  customLabels: [
    /**
     * take ANSI color refrence from https://talyian.github.io/ansicolors/
     * !available colorlist :
     * ["BLACK", "RED", "GREEN", "YELLOW", "BLUE", "CYAN", "WHITE", "BLACKBG", "REDBG", "GREENBG", 
     *  "YELLOWBG", "BLUEBG", "MEGENTABG", "CYANBG", "WHITEBG", "RESET", RGBColor, AnsiColor];
     */
    
    { label: 'custom', color: {ansiCode: '\x1b[38;5;9m'} },
    { label: 'unique', color: 'RED' },
    { label: 'insideFunction', color: {R:255,G:204,B:229,isBackground:true} }
  ],
  printTimestamp: true,
  printLabelName: true,
  printCallerFunctionLocation: true,
};

const {logger} = new Logger(options);

let test = ()=>{
  logger.insideFunction('Inside a function');
}
test();
logger.info('This is an informational message');
logger.warning('This is a warning message');
logger.error('This is an error message');
logger.custom('This is a custom message');
logger.critical('This is a critical message');
logger.alert('This is a alert message');
logger.log('This is a log message');
logger.notify('This is a notify message');
logger.success('This is a success message');
logger.unique('We are happy');
