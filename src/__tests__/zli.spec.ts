import { z } from 'zod';
import { zli, type ZliWriteStream } from '../zli';
import { test, describe, expect, mock } from 'bun:test';

interface TestWriteStream extends ZliWriteStream {
  read(): string;
}

function createWriteStream(): TestWriteStream {
  let buffer = '';

  return {
    write(str: string, _, cb) {
      buffer += str;
      cb?.();
      return true;
    },
    read() {
      return buffer;
    },
  };
}

describe('zli', () => {
  test('should print the description of a command when --help is passed', async () => {
    const stdout = createWriteStream();
    await zli({ stdout })
      .help()
      .command('echo', (cmd) =>
        cmd.describe('Prints a message').invoke(() => {})
      )
      .exec(['--help']);

    expect(stdout.read()).toMatch(/prints a message/i);
  });
});

describe('zli commands', () => {
  test('should print "Hello world" to stdout', async () => {
    const stdout = createWriteStream();
    await zli({ stdout })
      .command('echo', (cmd) =>
        cmd.invoke((_, stdout) => stdout.write('Hello world'))
      )
      .exec(['echo']);

    expect(stdout.read()).toMatch(/hello world/i);
  });

  test('should print an error message when no arguments are passed to "echo"', async () => {
    const stdout = createWriteStream();
    await zli({ stdout })
      .command('echo', (cmd) =>
        cmd.invoke(({ _ }, stdout) => {
          if (_.length === 0) {
            stdout.write('Error: No message provided');
          } else {
            stdout.write(_.join(' '));
          }
        })
      )
      .exec(['echo']);
    expect(stdout.read()).toMatch(/error: no message provided/i);
  });

  // generated with Copilot "generate a test case for an undefined command"
  test('should print an error message for a non-existent command', async () => {
    const stdout = createWriteStream();
    await zli({ stdout }).exec(['nonexistent']);
    expect(stdout.read()).toMatch(/command not found/i);
  });

  test('calls a mock fn with the given arguments from the command line', async () => {
    const stdout = createWriteStream();
    const mockFn = mock((_: string) => {});
    await zli({ stdout })
      .command('greet', (cmd) =>
        cmd
          .arguments({
            name: z.string(),
          })
          .invoke(({ name }, stdout) => {
            mockFn(name);
            stdout.write(`Hello, ${name}!`);
          })
      )
      .exec(['greet', 'John Doe']);

    expect(mockFn).toHaveBeenCalledWith('John Doe');
    expect(stdout.read()).toMatch(/hello, john doe/i);
  });
});
