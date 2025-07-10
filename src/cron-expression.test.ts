import {describe, itCases} from '@augment-vir/test';
import {createExpressionPartString, createExpressionString} from './cron-expression.js';

describe(createExpressionString.name, () => {
    itCases(createExpressionString, [
        {
            it: 'handles no seconds',
            input: {
                minute: '*',
                hour: {
                    all: true,
                },
                dayOfMonth: {
                    lastDay: true,
                },
                month: {
                    all: true,
                },
                dayOfWeek: {
                    each: {
                        dayOfWeek: 2,
                        ofTheMonth: 3,
                    },
                },
            },
            expect: '* * L * 2#3',
        },
        {
            it: 'handles with seconds',
            input: {
                second: 2,
                minute: '*',
                hour: {
                    all: true,
                },
                dayOfMonth: {
                    lastDay: true,
                },
                month: {
                    all: true,
                },
                dayOfWeek: {
                    each: {
                        dayOfWeek: 2,
                        ofTheMonth: 3,
                    },
                },
            },
            expect: '2 * * L * 2#3',
        },
    ]);
});

describe(createExpressionPartString.name, () => {
    itCases(createExpressionPartString, [
        {
            it: 'handles undefined',
            input: undefined,
            expect: '',
        },
        {
            it: 'handles raw numbers',
            input: 5,
            expect: '5',
        },
        {
            it: 'passes a string',
            input: 'Q',
            expect: 'Q',
        },
        {
            it: 'handles all',
            input: {
                all: true,
            },
            expect: '*',
        },
        {
            it: 'handles a list',
            input: {
                list: [
                    1,
                    2,
                    3,
                ],
            },
            expect: '1,2,3',
        },
        {
            it: 'handles an empty list',
            input: {
                list: [],
            },
            expect: '*',
        },
        {
            it: 'handles a range',
            input: {
                range: {
                    min: 7,
                    max: 19,
                },
            },
            expect: '7-19',
        },
        {
            it: 'handles a step without start',
            input: {
                step: {
                    step: 5,
                },
            },
            expect: '*/5',
        },
        {
            it: 'handles a step with start',
            input: {
                step: {
                    start: 7,
                    step: 5,
                },
            },
            expect: '7/5',
        },
        {
            it: 'handles plain random',
            input: {
                random: true,
            },
            expect: 'H',
        },
        {
            it: 'handles bounded random',
            input: {
                random: {
                    min: 3,
                    max: 8,
                },
            },
            expect: 'H(3-8)',
        },
        {
            it: 'handles last day',
            input: {
                lastDay: true,
            },
            expect: 'L',
        },
        {
            it: 'handles plain each',
            input: {
                each: {
                    dayOfWeek: 3,
                    ofTheMonth: 2,
                },
            },
            expect: '3#2',
        },
        {
            it: 'handles random each',
            input: {
                each: {
                    dayOfWeek: {
                        random: true,
                    },
                    ofTheMonth: {
                        random: {
                            min: 1,
                            max: 4,
                        },
                    },
                },
            },
            expect: 'H#H(1-4)',
        },
        {
            it: 'errors on invalid input',
            input: {
                // @ts-expect-error: intentionally invalid property
                invalid: 5,
            },
            throws: {
                matchMessage: 'Unexpected cron expression',
            },
        },
    ]);
});
