import {wait} from '@augment-vir/common';
import {utcTimezone} from 'date-vir';
import {defineCronSuite} from './cron-suite.js';

export const mockContext = {
    something: 42,
};

const {defineCron, runCrons} = defineCronSuite<typeof mockContext>();

export const runMockCrons = runCrons;

export const mockCrons = [
    defineCron(
        'mock 1',
        {
            second: '*/2',
            minute: '*',
            hour: '*',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '*',
        },
        () => {},
        utcTimezone,
    ),
    defineCron(
        'mock 2',
        {
            second: '*/5',
            minute: '*',
            hour: '*',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '*',
        },
        async () => {
            await wait({
                seconds: 1.5,
            });
        },
        utcTimezone,
    ),
];
