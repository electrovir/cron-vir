# cron-vir

A declarative cron function runner.

Reference docs: https://electrovir.github.io/cron-vir

## Install

```sh
npm i cron-vir
```

## Usage

The primary entry point is `defineCronSuite`. Use this to create `defineCron` and `runCrons` functions:

<!-- example-link: src/readme-examples/cron-suite.example.ts -->

```TypeScript
import {defineCronSuite} from 'cron-vir';

type MyContext = {user: string};

const {defineCron, runCrons} = defineCronSuite<MyContext>();

const myCron = defineCron({
    name: 'my cron',
    cronExpression: {
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
    },
    callback: () => {
        // do something
    },
});

runCrons({
    context: {
        user: 'ubuntu',
    },
    crons: [myCron],
});
```
