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

const myCron = defineCron(
    'my cron',
    {
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
    },
    () => {
        // do something
    },
);

runCrons({user: 'ubuntu'}, [myCron]);
```
