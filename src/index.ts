#!/usr/bin/env bun
import { z } from 'zod';
import { zli } from './zli';

const app = zli()
  .showHelpOnNotFound()
  .help()
  .command('echo', (cmd) =>
    cmd
      .describe('Echoes the input')
      .invoke(({ _ }, stdout) => stdout.write(_.join(' ')))
  );

await app.exec(process.argv.slice(2));
