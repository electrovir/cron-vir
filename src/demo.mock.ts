/* node:coverage disable: this is a demo */

import {log} from '@augment-vir/common';
import {diffDates, getNowInUtcTimezone} from 'date-vir';
import {defineCronSuite} from './cron-suite.js';

const startTime = getNowInUtcTimezone();

const {defineCron, runCrons} = defineCronSuite();

runCrons(undefined, [
    defineCron('fast cron', '* * * * * *', () => {
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
    }),
    defineCron(
        'slow cron',
        {
            minute: '*',
            hour: '*',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '*',
        },
        () => {
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
    ),
]);
