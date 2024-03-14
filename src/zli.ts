const parser = require('yargs-parser');
import { z } from 'zod';
import { camelCase, kebabCase } from 'change-case';
import type { WriteStream } from 'tty';

const TERMINAL_WIDTH = 80;

/// Types
/**
 * Represents an empty options shape. This is the default.
 */
export type EmptyOptions = {
  //
};

type PrimitiveZodTypes =
  | z.ZodString
  | z.ZodEffects<z.ZodString, string>
  | z.ZodNumber
  | z.ZodEffects<z.ZodNumber, number>
  | z.ZodBoolean
  | z.ZodEffects<z.ZodBoolean, boolean>
  | z.ZodAny
  | z.ZodEffects<z.ZodAny, any>
  | z.ZodUnion<[PrimitiveZodTypes, ...PrimitiveZodTypes[]]>;

type ObjectZodType = {
  [key: string]: PermittedZodTypes | z.ZodObject<ObjectZodType, 'strip'>;
};

export type PermittedZodTypes =
  | PrimitiveZodTypes
  | z.ZodEnum<[string, ...string[]]>
  | z.ZodOptional<PermittedZodTypes>
  | z.ZodDefault<PermittedZodTypes>
  | z.ZodArray<PermittedZodTypes>
  | z.ZodObject<ObjectZodType, 'strip'>
  | z.ZodRecord<z.ZodString, z.ZodTypeAny>;

/**
 * Forwards `write` from node:tty:WriteStream
 */
export interface ZliWriteStream {
  write(...args: Parameters<WriteStream['write']>): any | Promise<any>;
}

export interface CommandPreInvokeFunction<TGlobalOptions extends OptionsShape> {
  (options: Options<TGlobalOptions>): void | Promise<void>;
}

/**
 * The command handler interface for a command
 */
export interface CommandInvokeFunction<
  TGlobalOptions extends OptionsShape,
  TArgs extends ArgumentsShape,
  TOptions extends OptionsShape
> {
  (
    /**
     * A collection of arguments in the order of TGlobalOptions -> TArgs -> TOptions
     */
    args: ParsedArguments & Arguments<TGlobalOptions & TArgs & TOptions>,
    /**
     * A secondary reference to the ZliWriteStream used
     */
    stdout: ZliWriteStream
  ): void | Promise<void>;
}

export interface CommandPostInvokeFunction<
  TGlobalOptions extends OptionsShape
> {
  (options: Options<TGlobalOptions>): void | Promise<void>;
}

export interface CommandSetupFunction<TGlobalOptions extends OptionsShape> {
  (options: Options<TGlobalOptions>, stdout: ZliWriteStream):
    | void
    | Promise<void>
    | boolean
    | Promise<boolean>;
}

type PrimitiveType = string | boolean | number;
type OptionObject = {
  [key: string]: PrimitiveType | OptionObject;
};

/**
 * Represents the base parsed args from yargs-parser
 *
 * @description
 * All named options are returned as properties in the return object. Any non-option arguments
 * are appended to `_` as a string, number, or boolean.
 */
export type ParsedArguments = {
  [key: string]: PrimitiveType | Array<PrimitiveType> | OptionObject;
} & {
  _: Array<string>;
};

/**
 * Represents an expected arguments shape for a command
 */
export type ArgumentsShape = {
  [name: string]: PermittedZodTypes;
};

/**
 * Represents an options shape for a command
 */
export type OptionsShape = {
  [name: string]: PermittedZodTypes;
};

/**
 * Represents a type that extends `OptionsShape` and includes an optional `help` property.
 * @template T - The type that extends `OptionsShape`.
 */
export type WithHelp<T extends OptionsShape> = T & {
  help: z.ZodOptional<z.ZodBoolean>;
};

/**
 * Represents the type of arguments for a given shape.
 * @template TShape - The shape of the arguments.
 */
export type Arguments<TShape extends ArgumentsShape> = {
  [key in keyof TShape]: z.TypeOf<TShape[key]>;
};

/**
 * Represents a set of options for a specific shape.
 * @template TShape - The shape of the options.
 */
export type Options<TShape extends OptionsShape> = {
  [key in keyof TShape]: z.TypeOf<TShape[key]>;
};

export type OptionsHelp<T extends OptionsShape> = {
  [key in keyof T]: string;
};

export type ShorthandDefinitions<T extends OptionsShape> = {
  [key in keyof T]?: `-${string}`;
};

type InvokeMeta = {
  showHelpOnError: boolean;
  showHelpOnNotFound: boolean;
  ignoreUnknownOptions: boolean;
  header?: string;
  footer?: string;
};

/**
 * Represents the main interface for a Zli command-line application.
 *
 * @template TGlobalOptions - The shape of the global options for the Zli application.
 */
export interface Zli<TGlobalOptions extends OptionsShape = EmptyOptions> {
  /**
   * Defines a command for the Zli interface.
   * @template TArgs - The shape of the command arguments.
   * @template TOptions - The shape of the command options.
   * @param name - The name of the command.
   * @param cmd - The command function.
   * @returns The updated Zli interface.
   */
  command<
    TArgs extends ArgumentsShape = EmptyOptions,
    TOptions extends OptionsShape = EmptyOptions
  >(
    name: string,
    cmd: (
      cmd: Command<TGlobalOptions, TArgs, TOptions>
    ) => Command<TGlobalOptions, TArgs, TOptions>
  ): Zli<TGlobalOptions>;

  /**
   * Sets the options for the Zli interface.
   * @template TOptions - The shape of the options.
   * @param opts - The options to set.
   * @returns The updated Zli interface.
   */
  options<TOptions extends OptionsShape>(opts: TOptions): Zli<TOptions>;

  /**
   * Sets a function to be executed before invoking a command.
   * @param fn - The function to be executed.
   * @returns The updated Zli interface.
   */
  beforeInvoke(
    fn: (opts: Options<TGlobalOptions>) => void | Promise<void>
  ): Zli<TGlobalOptions>;

  /**
   * Sets a function to be executed after invoking a command.
   * @param fn - The function to be executed.
   * @returns The updated Zli interface.
   */
  afterInvoke(
    fn: (opts: Options<TGlobalOptions>) => void | Promise<void>
  ): Zli<TGlobalOptions>;

  /**
   * Executes the Zli command with the specified arguments.
   * @param args - The command arguments.
   * @returns A promise that resolves when the command execution is complete.
   */
  exec(args?: string[]): Promise<void>;

  /**
   * Displays the help information for the Zli interface.
   * @returns The updated Zli interface with help information.
   */
  help(): Zli<WithHelp<TGlobalOptions>>;

  /**
   * Sets the shorthand definitions for the Zli interface.
   * @param shorthands - The shorthand definitions.
   * @returns The updated Zli interface.
   */
  shorthands(
    shorthands: ShorthandDefinitions<TGlobalOptions>
  ): Zli<TGlobalOptions>;

  /**
   * Sets the version for the Zli interface.
   * @param version - The version string.
   * @returns The updated Zli interface.
   */
  version(version: string): Zli<TGlobalOptions>;

  /**
   * Configures the Zli interface to show help information when a command is not found.
   * @returns The updated Zli interface.
   */
  showHelpOnNotFound(): Zli<TGlobalOptions>;

  /**
   * Configures the Zli interface to show help information when an error occurs.
   * @returns The updated Zli interface.
   */
  showHelpOnError(): Zli<TGlobalOptions>;
}

/**
 * Represents a command in a command-line interface.
 *
 * @template TGlobalOptions - The shape of the global options.
 * @template TArgs - The shape of the command arguments.
 * @template TOptions - The shape of the command options.
 */
export interface Command<
  TGlobalOptions extends OptionsShape = EmptyOptions,
  TArgs extends ArgumentsShape = EmptyOptions,
  TOptions extends OptionsShape = EmptyOptions
> {
  /**
   * Adds a subcommand to the current command.
   * @param name - The name of the subcommand.
   * @param cmd - The callback function that defines the subcommand.
   * @returns The current command with the added subcommand.
   */
  command<
    TArgs2 extends ArgumentsShape = EmptyOptions,
    TOptions2 extends OptionsShape = EmptyOptions
  >(
    name: string,
    cmd: (
      cmd: Command<TGlobalOptions, TArgs2, TOptions2>
    ) => Command<any, TArgs2, TOptions2>
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets the help text for the current command.
   * @param help - The help text for the command options.
   * @returns The current command with the updated help text.
   */
  help(help: OptionsHelp<TOptions>): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets the description for the current command.
   * @param description - The description of the command.
   * @returns The current command with the updated description.
   */
  describe(description: string): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets the arguments for the current command.
   * @param args - The shape of the command arguments.
   * @returns The current command with the updated arguments.
   */
  arguments<TArgs extends ArgumentsShape = EmptyOptions>(
    args: TArgs
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets the options for the current command.
   * @param opts - The shape of the command options.
   * @returns The current command with the updated options.
   */
  options<TOptions extends OptionsShape>(
    opts: TOptions
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets the shorthands for the current command.
   * @param shorthands - The partial shorthand definitions for the command options.
   * @returns The current command with the updated shorthands.
   */
  shorthands(
    shorthands: Partial<ShorthandDefinitions<TOptions>>
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Ignores unknown options for the current command.
   * @returns The current command with the ignore unknown options flag set.
   */
  ignoreUnknownOptions(): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets up the command with a setup function.
   * @param fn - The setup function for the command.
   * @returns The current command with the setup function set.
   */
  setup(
    fn: CommandSetupFunction<TGlobalOptions>
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets a pre-invoke function for the current command.
   * @param fn - The pre-invoke function for the command.
   * @returns The current command with the pre-invoke function set.
   */
  preInvoke(
    fn: (options: Options<TGlobalOptions>) => void
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets an invoke function for the current command.
   * @param fn - The invoke function for the command.
   * @returns The current command with the invoke function set.
   */
  invoke(
    fn: CommandInvokeFunction<TGlobalOptions, TArgs, TOptions>
  ): Command<TGlobalOptions, TArgs, TOptions>;

  /**
   * Sets a post-invoke function for the current command.
   * @param fn - The post-invoke function for the command.
   * @returns The current command with the post-invoke function set.
   */
  postInvoke(
    fn: (options: Options<TGlobalOptions>) => void
  ): Command<TGlobalOptions, TArgs, TOptions>;
}

/// Implementations

class _Zli<TGlobalOptions extends OptionsShape> implements Zli<TGlobalOptions> {
  readonly _commands = new Map<string, _Command<TGlobalOptions, any, any>>();
  readonly _meta: InvokeMeta = {
    showHelpOnError: false,
    showHelpOnNotFound: false,
    ignoreUnknownOptions: false,
  };
  _formattedArgs?: ParsedArguments;
  _globalOptions?: TGlobalOptions;
  _globalShorthands?: ShorthandDefinitions<TGlobalOptions>;
  _version?: string;
  _beforeInvoke?: (opts: Options<TGlobalOptions>) => void | Promise<void>;
  _afterInvoke?: (opts: Options<TGlobalOptions>) => void | Promise<void>;

  constructor(private readonly _stdout: ZliWriteStream) {}

  getStdout() {
    return this._stdout;
  }

  /**
   * Defines a command in the Zli application.
   * @param name - The name of the command.
   * @param cmd - A function that takes a command instance and returns a modified command instance.
   * @returns The Zli instance.
   */
  command<
    TArgs2 extends ArgumentsShape = EmptyOptions,
    TOptions2 extends OptionsShape = EmptyOptions
  >(
    name: string,
    cmd: (
      cmd: Command<TGlobalOptions, TArgs2, TOptions2>
    ) => Command<TGlobalOptions, TArgs2, TOptions2>
  ): _Zli<TGlobalOptions> {
    const command = new _Command<TGlobalOptions, TArgs2, TOptions2>(
      name,
      this,
      null
    );
    const setupCommand = cmd(command) as _Command<
      TGlobalOptions,
      TArgs2,
      TOptions2
    >;
    this._commands.set(name.toLowerCase(), setupCommand);
    return this;
  }

  /**
   * Sets the options for the Zli instance.
   *
   * @template TOptions - The type of the options object.
   * @param {TOptions} opts - The options object.
   * @returns {_Zli<TGlobalOptions & TOptions>} - The updated Zli instance with the new options.
   */
  options<TOptions extends OptionsShape>(
    opts: TOptions
  ): _Zli<TGlobalOptions & TOptions> {
    this._globalOptions = { ...(this._globalOptions ?? {}), ...opts } as any;
    return this as _Zli<TGlobalOptions & TOptions>;
  }

  help(): _Zli<WithHelp<TGlobalOptions>> {
    return this.options({
      help: z.boolean().optional(),
    }).shorthands({ help: '-h' }) as _Zli<WithHelp<TGlobalOptions>>;
  }

  /**
   * Sets the shorthand definitions for the command.
   *
   * @param shorthands - The shorthand definitions to set.
   * @returns The instance of `_Zli` with the updated shorthand definitions.
   */
  shorthands(
    shorthands: ShorthandDefinitions<TGlobalOptions>
  ): _Zli<TGlobalOptions> {
    this._globalShorthands = {
      ...(this._globalShorthands ?? {}),
      ...shorthands,
    };
    return this;
  }

  /**
   * Sets the flag to show help when a command is not found.
   * @returns The current instance of _Zli with the updated configuration.
   */
  showHelpOnNotFound(): _Zli<TGlobalOptions> {
    this._meta.showHelpOnNotFound = true;
    return this;
  }

  /**
   * Sets the `showHelpOnError` option to `true`.
   * When this option is enabled, the help message will be displayed when an error occurs.
   *
   * @returns The current `_Zli` instance.
   */
  showHelpOnError(): _Zli<TGlobalOptions> {
    this._meta.showHelpOnError = true;
    return this;
  }

  /**
   * Sets the version of the Zli instance.
   *
   * @param version - The version string to set.
   * @returns The updated Zli instance.
   */
  version(version: string): _Zli<TGlobalOptions> {
    this._version = version;
    return this;
  }

  displayHelp() {
    const help = buildHelpDisplay(
      '',
      this._commands,
      undefined,
      undefined,
      this._globalOptions,
      this._globalShorthands
    );
    this.write(help);
  }

  write(output: string | string[]) {
    if (Array.isArray(output)) {
      this._stdout.write(output.join('\n'));
    } else {
      this._stdout.write(output);
    }
    this._stdout.write('\n');
  }

  beforeInvoke(
    fn: (opts: Options<TGlobalOptions>) => void | Promise<void>
  ): _Zli<TGlobalOptions> {
    this._beforeInvoke = fn;
    return this;
  }

  afterInvoke(
    fn: (opts: Options<TGlobalOptions>) => void | Promise<void>
  ): _Zli<TGlobalOptions> {
    this._afterInvoke = fn;
    return this;
  }

  async exec(args?: string[]): Promise<void> {
    if (typeof args === 'undefined') {
      args = process.argv.slice(2);
    }
    const parsedArgs = camelCaseArgs(parser(args));
    if (typeof this._formattedArgs === 'undefined') {
      this._formattedArgs = parsedArgs;
    } else {
      this._formattedArgs = { ...this._formattedArgs, ...parsedArgs };
    }

    const [runArg, ...restArgs] = this._formattedArgs._;

    const expandedArgs = expandShorthandOptions(
      this._formattedArgs,
      this._globalShorthands
    );
    if (
      expandedArgs['help'] === true &&
      typeof runArg === 'undefined' &&
      typeof this._globalOptions?.help !== 'undefined'
    ) {
      return this.displayHelp();
    }
    const globalOptions = parseOptions(true, expandedArgs, this._globalOptions);
    if (typeof this._beforeInvoke !== 'undefined') {
      await this._beforeInvoke(globalOptions);
    }
    const cmd = this._commands.get(runArg);
    if (typeof cmd !== 'undefined') {
      const args = {
        ...this._formattedArgs,
        ...expandedArgs,
        _: restArgs,
      };
      try {
        await cmd.exec(args, globalOptions);
      } catch (err) {
        if (this._meta.showHelpOnError) {
          this.displayHelp();
        }
        if (err instanceof ZliError) {
          this.write(err.message);
        } else if (err instanceof z.ZodError) {
          for (const zerr of err.errors) {
            const [_, argName] = zerr.path;
            this.write(`${zerr.message} ${argName ? `(${argName})` : ''}`);
          }
        } else if (err instanceof Error) {
          err.stack ? this.write(err.stack) : this.write(err.message);
          return process.exit(1);
        }
      }
    } else if (typeof runArg !== 'undefined') {
      this.write(`Command not found: ${runArg}`);
      if (this._meta.showHelpOnNotFound) {
        this.displayHelp();
      }
    } else if (typeof this._version !== 'undefined') {
      this._stdout.write(this._version);
    } else if (this._globalOptions?.help) {
      this.displayHelp();
    }
    if (typeof this._afterInvoke !== 'undefined') {
      this._afterInvoke(globalOptions);
    }
  }
}

class _Command<
  TGlobalOptions extends OptionsShape = EmptyOptions,
  TArgs extends ArgumentsShape = EmptyOptions,
  TOptions extends OptionsShape = EmptyOptions
> implements Command<TGlobalOptions, TArgs, TOptions>
{
  private readonly _commands = new Map<
    string,
    _Command<TGlobalOptions, any, any>
  >();

  private _meta: InvokeMeta;
  private _help?: OptionsHelp<TOptions>;
  private _description?: string;
  private _argsSchema?: TArgs;
  private _optsSchema?: TOptions;
  private _shorthands?: ShorthandDefinitions<TOptions>;
  private _preinvoke?: CommandPreInvokeFunction<TGlobalOptions>;
  private _invoke?: CommandInvokeFunction<TGlobalOptions, TArgs, TOptions>;
  private _postinvoke?: CommandPostInvokeFunction<TGlobalOptions>;
  private _setup?: CommandSetupFunction<TGlobalOptions>;

  get fullName(): string {
    if (this._parent === null) {
      return this._name;
    }
    return `${this._parent.fullName} ${this._name}`;
  }

  constructor(
    private readonly _name: string,
    private readonly _factory: _Zli<TGlobalOptions>,
    private readonly _parent: _Command<TGlobalOptions, any, any> | null
  ) {
    this._meta = _factory._meta;
  }

  private _getSubcommandWithNewArgs(
    args?: ParsedArguments
  ): [_Command<TGlobalOptions, any, any> | undefined, ParsedArguments] {
    if (typeof args === 'undefined') {
      return [undefined, args!];
    }
    const [arg] = args._;
    const slicedArgs = { ...args, _: args._.slice(1) };
    if (typeof arg !== 'undefined' && this._commands.has(arg)) {
      return [this._commands.get(arg), slicedArgs];
    }
    return [undefined, slicedArgs];
  }

  getHelp(args?: ParsedArguments): OptionsHelp<TOptions> | undefined {
    const [subcommand, newArgs] = this._getSubcommandWithNewArgs(args);
    return subcommand?.getHelp(newArgs) ?? this._help;
  }

  getDescription(args?: ParsedArguments): string | undefined {
    const [subcommand, newArgs] = this._getSubcommandWithNewArgs(args);
    return subcommand?.getDescription(newArgs) ?? this._description ?? '';
  }

  getArgsSchema(args?: ParsedArguments): TArgs | undefined {
    const [subcommand, newArgs] = this._getSubcommandWithNewArgs(args);
    return subcommand?.getArgsSchema(newArgs) ?? this._argsSchema;
  }

  getOptsSchema(args?: ParsedArguments): TOptions | undefined {
    const [subcommand, newArgs] = this._getSubcommandWithNewArgs(args);
    return subcommand?.getOptsSchema(newArgs) ?? this._optsSchema;
  }

  getShorthands(
    args?: ParsedArguments
  ): ShorthandDefinitions<TOptions> | undefined {
    const [subcommand, newArgs] = this._getSubcommandWithNewArgs(args);
    return subcommand?.getShorthands(newArgs) ?? this._shorthands;
  }

  command<
    TArgs2 extends ArgumentsShape = EmptyOptions,
    TOptions2 extends OptionsShape = EmptyOptions
  >(
    name: string,
    cmd: (
      cmd: Command<TGlobalOptions, TArgs2, TOptions2>
    ) => Command<TGlobalOptions, TArgs2, TOptions2>
  ): Command<TGlobalOptions, TArgs, TOptions> {
    const command = new _Command<TGlobalOptions, TArgs2, TOptions2>(
      name,
      this._factory,
      this
    );
    const setupCommand = cmd(command) as _Command<
      TGlobalOptions,
      TArgs2,
      TOptions2
    >;
    this._commands.set(name.toLowerCase(), setupCommand);
    return this;
  }

  help(help: OptionsHelp<TOptions>): Command<TGlobalOptions, TArgs, TOptions> {
    this._help = help;
    return this;
  }

  describe(
    description: string | undefined
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._description = description;
    return this;
  }

  arguments<TArgs extends ArgumentsShape>(
    args: TArgs
  ): Command<TGlobalOptions, TArgs, TOptions> {
    // @ts-ignore due to it returning a different type, it gets a bit touchy
    this._argsSchema = args;
    // @ts-ignore
    return this as Command<TGlobalOptions, TArgs, TOptions>;
  }

  options<TOptions extends OptionsShape>(
    opts: TOptions
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._optsSchema = opts as any;
    return this as _Command<TGlobalOptions, TArgs, TOptions>;
  }

  shorthands(
    shorthands: Partial<ShorthandDefinitions<TOptions>>
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._shorthands = { ...(this._shorthands ?? {}), ...shorthands };
    return this;
  }

  ignoreUnknownOptions(): Command<TGlobalOptions, TArgs, TOptions> {
    this._meta.ignoreUnknownOptions = true;
    return this;
  }

  setup(
    fn: CommandSetupFunction<TGlobalOptions>
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._setup = fn;
    return this;
  }

  preInvoke(
    fn: CommandPreInvokeFunction<TGlobalOptions>
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._preinvoke = fn;
    return this;
  }

  invoke(
    fn: CommandInvokeFunction<TArgs, TOptions, TGlobalOptions>
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._invoke = fn;
    return this;
  }

  postInvoke(
    fn: CommandPostInvokeFunction<TGlobalOptions>
  ): Command<TGlobalOptions, TArgs, TOptions> {
    this._postinvoke = fn;
    return this;
  }

  displayHelp() {
    const help = buildHelpDisplay(
      this._name,
      this._commands,
      this._description,
      this._argsSchema,
      this._optsSchema,
      this._shorthands
    );
    this._factory.write(help);
  }

  async exec(
    args: ParsedArguments,
    globalOptions: Options<TGlobalOptions>
  ): Promise<boolean> {
    // setup gets called before anything and should always be called
    if (!('help' in args)) {
      const didSetup = await this._setup?.(
        globalOptions,
        this._factory.getStdout()
      );
      if (didSetup === false) {
        return false;
      }
    }
    // pre-invokes get called for each command and child
    await this._preinvoke?.(globalOptions);
    assertNoRequiredArgsAfterOptional(this._argsSchema);
    const [subcommand, newArgs] = this._getSubcommandWithNewArgs(args);
    if (subcommand) {
      const result = await subcommand.exec(newArgs, globalOptions);
      if (result) {
        await this._postinvoke?.(globalOptions);
      }
      return result;
    }
    // args should have 'help' from the factory class
    if (args.help) {
      this.displayHelp();
      return true;
    }
    if (args._.length < Object.keys(this._argsSchema ?? {}).length) {
      this.displayHelp();
      return false;
    }
    if (!this._invoke) {
      this.displayHelp();
      return false;
    }
    const expandedArgs = expandShorthandOptions(args, this._shorthands);
    const parsedArgs = parseArguments(args, this._argsSchema);
    const parsedOptions = parseOptions(
      this._meta.ignoreUnknownOptions,
      expandedArgs,
      this._optsSchema
    );
    const invokeArgs = spreadLikeButter(
      args,
      globalOptions,
      parsedArgs,
      parsedOptions
    );

    try {
      await this._invoke(invokeArgs, this._factory.getStdout());
      await this._postinvoke?.(globalOptions);
    } catch (err: any) {
      if (
        err instanceof NoRequiredArgumentsAfterOptionalsError ||
        err instanceof UnknownOptionError
      ) {
        throw err;
      }
      if (err instanceof z.ZodError) {
        for (const zerr of err.errors) {
          this._factory.write(
            `${zerr.message} ${zerr.path[0] ? `(${zerr.path[0]})` : ''}`
          );
        }
      } else {
        this._factory.write(`[ERROR] ${err}`);
        throw err;
      }

      if (this._meta.showHelpOnError) {
        this.displayHelp();
      }
      return false;
    }
    return true;
  }
}

/// Errors

class ZliError extends Error {}

export class CommandError extends ZliError {
  constructor(cmd: Command, message: string) {
    super(`Failed to run ${(cmd as _Command).fullName} (${message})`);
  }
}

export class NoRequiredArgumentsAfterOptionalsError extends ZliError {
  constructor() {
    super('Cannot have required arguments after optional');
  }
}

export class UnknownOptionError extends ZliError {
  constructor(option: string) {
    super(`Unknown option: --${kebabCase(option)}`);
  }
}

export class IncorrectUsageError extends ZliError {}

export type ZliOptions = {
  stdout?: ZliWriteStream;
};

export function zli(opts?: ZliOptions): Zli {
  opts ??= {};
  if (typeof opts.stdout === 'undefined') {
    opts.stdout = process.stdout;
  }
  return new _Zli(opts.stdout!);
}

/// Helper functions

const ignoredArgKeys = ['--', '_'];

function camelCaseArgs(args: ParsedArguments): ParsedArguments {
  return Object.keys(args).reduce((acc, key) => {
    if (ignoredArgKeys.includes(key)) {
      return { ...acc, [key]: args[key] };
    }
    if (typeof args[key] === 'object' && !Array.isArray(args[key])) {
      // reiterate through children
      return {
        ...acc,
        [camelCase(key)]: camelCaseArgs(args[key] as ParsedArguments),
      };
    }
    return {
      ...acc,
      [camelCase(key)]: args[key],
    };
  }, Object.create(null));
}

export function expandShorthandOptions<TOptions extends OptionsShape>(
  args: ParsedArguments,
  shorthands?: Partial<ShorthandDefinitions<TOptions>>
): Options<TOptions> {
  if (typeof shorthands === 'undefined') {
    return args as Options<TOptions>;
  }
  for (const [longhand, shorthand] of Object.entries(shorthands)) {
    const key = shorthand!.substring(1);
    if (typeof args[key] !== 'undefined') {
      args[longhand] = args[shorthand!.substring(1)];
      delete args[shorthand!.substring(1)];
    }
  }

  return args as Options<TOptions>;
}

function parseArguments<TArgs extends ArgumentsShape>(
  args: ParsedArguments,
  schema?: TArgs
): Arguments<TArgs> {
  if (typeof schema === 'undefined') {
    return args as Arguments<TArgs>;
  }
  const parsedArgs = Object.create(null);
  const schemaDefinitions = Object.entries(schema);
  const requiredArgsCount = schemaDefinitions.filter(
    ([_, shape]) =>
      !shape.isOptional() ||
      (shape instanceof z.ZodDefault &&
        typeof shape._def.defaultValue() !== 'undefined')
  ).length;
  if (args._.length < requiredArgsCount) {
    throw new IncorrectUsageError(
      `Received ${args._.length}, expected ${requiredArgsCount}`
    );
  }
  let i = 0;
  for (; i < args._.length; i++) {
    const value = args._[i];
    const schema = schemaDefinitions[i];
    if (typeof schema === 'undefined') {
      // we don't try to parse and have no more left, just return what we have
      return parsedArgs;
    }
    const [key, shape] = schemaDefinitions[i];
    try {
      parsedArgs[key] = parse(value, shape);
    } catch (err) {
      if (err instanceof z.ZodError) {
        for (const zerr of err.errors) {
          zerr.path.push(key);
        }
      }
      throw err;
    }
  }
  parsedArgs._ = args._.slice(i);

  return parsedArgs;
}

function parseOptions<TOptions extends OptionsShape>(
  ignoreUnknownOptions: boolean,
  options: Options<TOptions>, // this is Options because it expects shorthands to be processed
  schema?: TOptions
): Options<TOptions> {
  if (typeof schema === 'undefined') {
    return options;
  }
  const parsedOptions = Object.create(null);
  for (const [key, shape] of Object.entries(schema)) {
    // ignore yargs keys
    if (['_', '--'].includes(key)) {
      continue;
    }
    const value = options[key];
    try {
      parsedOptions[key] = parse(value, shape);
    } catch (err) {
      if (err instanceof z.ZodError) {
        for (const zerr of err.errors) {
          zerr.path.push(`--${key}`);
        }
      }
      throw err;
    }
  }
  for (const [key, value] of Object.entries(options)) {
    // ignore yargs keys
    if (['_', '--'].includes(key)) {
      continue;
    }
    if (!(key in schema)) {
      if (!ignoreUnknownOptions) {
        throw new UnknownOptionError(key);
      } else {
        parsedOptions[key] = value;
      }
    }
    try {
      parsedOptions[key] = parse(value, schema[key]);
    } catch (err) {
      if (err instanceof z.ZodError) {
        for (const zerr of err.errors) {
          zerr.path.push(`--${key}`);
        }
      }
      throw err;
    }
  }
  return parsedOptions;
}

function assertNoRequiredArgsAfterOptional(args?: ArgumentsShape) {
  if (typeof args === 'undefined') {
    return;
  }
  let isReadingRequired = true;
  for (const [_, shape] of Object.entries(args)) {
    if (
      (shape.isOptional() || shape instanceof z.ZodDefault) &&
      isReadingRequired
    ) {
      isReadingRequired = false;
    } else if (!isReadingRequired) {
      throw new NoRequiredArgumentsAfterOptionalsError();
    }
  }
}

function buildHelpDisplay(
  name: string,
  commands?: Map<string, _Command<any, any, any>>,
  description?: string,
  args?: ArgumentsShape,
  options?: OptionsShape,
  shorthands?: ShorthandDefinitions<any>
) {
  const result = [];
  if (typeof args !== 'undefined') {
    result.push('Usage:', '');
    const requiredArgs = [];
    const optionalArgs = [];
    for (const [name, shape] of Object.entries(args)) {
      if (shape.isOptional()) {
        if (shape instanceof z.ZodDefault) {
          optionalArgs.push(
            `${name}:${shape._type}:${shape._def.defaultValue()}`
          );
        } else {
          optionalArgs.push(`${name}:${shape._type}`);
        }
      } else if (shape instanceof z.ZodDefault) {
        optionalArgs.push(
          `${name}:${shape._type}:${shape._def.defaultValue()}`
        );
      } else {
        requiredArgs.push(`${name}:${getTypename(shape) ?? 'any'}`);
      }
    }
    const commandUsage =
      `${name} ` +
      (requiredArgs.length > 0
        ? requiredArgs.map((a) => `<${a}>`).join(' ')
        : '') +
      (optionalArgs.length > 0
        ? optionalArgs.map((a) => `[${a}]`).join(' ')
        : '');
    result.push(commandUsage);
  } else {
    result.push(name);
  }

  if (typeof description !== 'undefined') {
    result.push('\nDescription:', `\t${description}`, '');
  }

  if (typeof options !== 'undefined') {
    result.push('Options:');
    for (const [name, shape] of Object.entries(options)) {
      const dashName = kebabCase(name);
      const nameToDisplay =
        typeof shorthands?.[name] !== 'undefined'
          ? `--${dashName}|${shorthands[name]}`
          : `--${dashName}`;
      const typename = getTypename(shape);
      const spacesToAdd =
        TERMINAL_WIDTH - nameToDisplay.length - typename.length;
      if (spacesToAdd <= 0 || typeof spacesToAdd !== 'number') {
        continue;
      }
      const padding = Array(spacesToAdd)
        .map(() => '')
        .join(' ');
      result.push(`${nameToDisplay}${padding}${typename}`);
      if (
        typeof shape.description !== 'undefined' &&
        !shape.description.match(/undefined/i)
      ) {
        result.push(`\t${shape.description}`);
      }
    }
    result.push('');
  }
  if (typeof commands !== 'undefined') {
    for (const [name, command] of commands.entries()) {
      const description = command.getDescription();
      result.push(name, `\t${description}`);
    }
  }
  return result;
}

/**
 * Returns the typename of a given shape.
 * @param shape - The shape to get the typename of.
 * @returns The typename of the shape.
 */
function getTypename(shape: PermittedZodTypes): string {
  if (shape instanceof z.ZodOptional) {
    return getTypename(shape.unwrap());
  }
  if (shape instanceof z.ZodDefault) {
    return getTypename(shape.removeDefault());
  }
  if (shape instanceof z.ZodString) {
    return 'string';
  }
  if (shape instanceof z.ZodNumber) {
    return 'number';
  }
  if (shape instanceof z.ZodBoolean) {
    return 'boolean';
  }
  if (shape instanceof z.ZodEnum) {
    return shape._def.values.join('|');
  }
  if (shape instanceof z.ZodArray) {
    return `(${getTypename(shape._def.type)})[]`;
  }
  if (shape instanceof z.ZodAny) {
    return 'any';
  }
  if (shape instanceof z.ZodUnion) {
    return shape._def.options.map(getTypename).join('|');
  }
  return '';
}

/**
 * Parses the given value based on the provided definition.
 *
 * @param value - The value to be parsed.
 * @param definition - The definition of the permitted types for parsing.
 * @returns The parsed value.
 */
function parse(value: any, definition: PermittedZodTypes): unknown {
  if (typeof value === 'undefined') {
    if (definition instanceof z.ZodDefault) {
      return definition._def.defaultValue();
    }
    return undefined;
  }
  if (typeof value === 'object') {
    return definition?.parse(value) ?? value;
  }
  const trimmed = String(value).trim();
  const lowered = trimmed.toLowerCase();
  if (!trimmed || String(trimmed).length === 0) {
    return definition.parse('');
  }
  if (definition instanceof z.ZodBoolean) {
    if (['true', 'yes', 'y', '1', 'accept', true, 1].includes(lowered)) {
      return definition.parse(true);
    } else if (['false', 'no', 'n', '0', 'deny', false, 0].includes(lowered)) {
      return definition.parse(false);
    } else {
      return definition.parse(true);
    }
  }
  if (definition instanceof z.ZodString) {
    return definition.parse(String(trimmed));
  }
  if (definition instanceof z.ZodNumber) {
    return definition.parse(Number(value));
  }
  if (
    definition instanceof z.ZodDefault ||
    definition instanceof z.ZodOptional
  ) {
    return parse(value, definition._def.innerType);
  }
  if (definition instanceof z.ZodArray) {
    if (!Array.isArray(value)) {
      return String(value)
        .split(',')
        .map((v) => parse(v, definition._def.type));
    } else {
      const array = value as Array<any>;
      return array.map((v) => parse(v, definition._def.type));
    }
  }
  return definition?.parse(value);
}

/**
 * Combines multiple objects into a single object by spreading their properties.
 * Null and undefined values are ignored.
 *
 * @param objs - The objects to be spread.
 * @returns The combined object.
 */
function spreadLikeButter(...objs: object[]) {
  const result = Object.create(null);
  for (const obj of objs) {
    for (const [key, value] of Object.entries(obj)) {
      if (value != null) {
        result[key] = value;
      }
    }
  }
  return result;
}
