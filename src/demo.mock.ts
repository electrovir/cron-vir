/* node:coverage disable: this is a demo */

import {log} from '@augment-vir/common';
import {diffDates, getNowInUtcTimezone} from 'date-vir';
import {defineCronSuite} from './cron-suite.js';

const startTime = getNowInUtcTimezone();

const {defineCron, runCrons} = defineCronSuite();

runCrons({
    context: undefined,
    crons: [
        defineCron({
            name: 'fast cron',
            cronExpression: '* * * * * *',
            callback: () => {
                const diff = diffDates(
                    {
                        start: startTime,
                        end: getNowInUtcTimezone(),
                    },
                    {
                        seconds: true,
                    },
                ).seconds;
                log.info(`${Math.round(diff)} seconds`);
            },
        }),
        defineCron({
            name: 'slow cron',
            cronExpression: {
                minute: '*',
                hour: '*',
                dayOfMonth: '*',
                month: '*',
                dayOfWeek: '*',
            },
            callback: () => {
                const diff = diffDates(
                    {
                        start: startTime,
                        end: getNowInUtcTimezone(),
                    },
                    {
                        minutes: true,
                    },
                ).minutes;
                log.warning(`${Math.round(diff)} minutes`);
            },
        }),
    ],
});
