import { zli, type ZliWriteStream } from '../zli';
import { test, describe, expect } from 'bun:test';

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
  test('should print "Hello world" to stdout', async () => {
    const stdout = createWriteStream();
    await zli({ stdout })
      .command('echo', (cmd) =>
        cmd.invoke((_, stdout) => stdout.write('Hello world'))
      )
      .exec(['echo']);

    expect(stdout.read()).toMatch(/hello world/i);
  });

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
