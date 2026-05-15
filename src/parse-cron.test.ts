import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {createUtcFullDate, utcTimezone} from 'date-vir';
import {getMillisecondsTillNextExecution} from './parse-cron.js';

describe(getMillisecondsTillNextExecution.name, () => {
    it('will fallback to user timezone', () => {
        assert.isDefined(
            getMillisecondsTillNextExecution({
                cronExpression: '* * * * *',
            }),
        );
    });
    itCases(getMillisecondsTillNextExecution, [
        {
            it: 'handles a string minute cron expression',
            input: {
                cronExpression: '* * * * *',
                timezone: utcTimezone,
                currentTime: createUtcFullDate(1_752_158_800_439),
            },
            expect: 19_561,
        },
        {
            it: 'handles a string second cron expression',
            input: {
                cronExpression: '* * * * * *',
                timezone: utcTimezone,
                currentTime: createUtcFullDate(1_752_158_800_439),
            },
            expect: 561,
        },
        {
            it: 'handles an object cron expression',
            input: {
                cronExpression: {
                    minute: {
                        all: true,
                    },
                    hour: {
                        all: true,
                    },
                    dayOfMonth: {
                        all: true,
                    },
                    month: {
                        all: true,
                    },
                    dayOfWeek: {
                        all: true,
                    },
                },
                timezone: utcTimezone,
                currentTime: createUtcFullDate(1_752_158_800_439),
            },
            expect: 19_561,
        },
    ]);
});
