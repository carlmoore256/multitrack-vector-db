import * as path from 'path';
import chalk from 'chalk'; //chalk is a popular library used to style console.log outputs

export enum LogColor {
  Red = 'Red',
  Green = 'Green',
  Blue = 'Blue',
  Yellow = 'Yellow',
  Aqua = 'Aqua',
  Purple = 'Purple',
  White = 'White',
  Black = 'Black',
  Gray = 'Gray',
  
  // add more colors if needed
}

const DEFAULT_COLOR = LogColor.Blue;

export class Debug {

  public static enableLogging = true;

  private static backLogSize = 100;

  private static backlog : string[] = [];

  private static output(message : string) {
    if (!this.enableLogging) {
      this.backlog.push(message);
      while (this.backlog.length > this.backLogSize) {
        this.backlog.shift();
      }
      return;
    }
    console.log(message);
  }

  public static flushBacklog() {
    for (const message of this.backlog) {
      this.output(message);
    }
    this.backlog = [];
  }

  public static getBackLog(clear : boolean = true) {
    const backlog = [...this.backlog];
    if (clear) this.backlog = [];
    return backlog;
  }

  static log(message: string, color: LogColor = DEFAULT_COLOR, prefix : string | null = null, important : boolean = false) {
    message = `\n${message}\n`
    if (prefix !== null) {
      message = `[${prefix}] ${message}`;
    }
    
    var coloredMessage = this.colorMessage(message, color);
    
    if (important) {
      message = `\n${message}\n`
      coloredMessage = chalk.bgRed(message);
    }
    this.output(coloredMessage);
  }


  static error(error: Error | any, message: string = "") {
    const coloredMessage = this.colorMessage(message, LogColor.Red);

    this.output(coloredMessage + "\n" + error);
  }

  static logObject(object : any, message : string = "") {
    if (message !== "") {
      message = `[${message}]`;
    }
    message += `\n${JSON.stringify(object, null, 2)}\n`
    
    const coloredMessage = this.colorMessage(message, LogColor.Blue);
    this.output(coloredMessage);
  }


  private static colorMessage(message: string, color: LogColor): string {
    switch (color) {
      case LogColor.Red:
        return chalk.red(message);
      case LogColor.Green:
        return chalk.green(message);
      case LogColor.Blue:
        return chalk.blue(message);
      case LogColor.Yellow:
        return chalk.yellow(message);
      // handle more colors if needed
      default:
        return message;
    }
  }
}

export default Debug;
