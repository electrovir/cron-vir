import {wait} from '@augment-vir/common';
import {utcTimezone} from 'date-vir';
import {defineCronSuite} from './cron-suite.js';

export const mockContext = {
    something: 42,
};

const {defineCron, runCrons} = defineCronSuite<typeof mockContext>();

export const runMockCrons = runCrons;

export const mockCrons = [
    defineCron({
        name: 'mock 1',
        cronExpression: {
            second: '*/2',
            minute: '*',
            hour: '*',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '*',
        },
        callback: () => {},
        timezone: utcTimezone,
    }),
    defineCron({
        name: 'mock 2',
        cronExpression: {
            second: '*/5',
            minute: '*',
            hour: '*',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '*',
        },
        callback: async () => {
            await wait({
                seconds: 1.5,
            });
        },
        timezone: utcTimezone,
    }),
];
