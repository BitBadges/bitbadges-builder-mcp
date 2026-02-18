/**
 * Tool: get_current_timestamp
 * Get current timestamp in milliseconds for time-dependent configurations
 */

import { z } from 'zod';

export const getCurrentTimestampSchema = z.object({
  offsetMs: z.number().optional().describe('Optional offset in milliseconds to add to current time'),
  offsetDays: z.number().optional().describe('Optional offset in days to add to current time'),
  offsetHours: z.number().optional().describe('Optional offset in hours to add to current time')
});

export type GetCurrentTimestampInput = z.infer<typeof getCurrentTimestampSchema>;

export interface GetCurrentTimestampResult {
  timestamp: string;
  timestampMs: number;
  isoDate: string;
  foreverEnd: string;
  helpers: {
    fiveMinutesFromNow: string;
    oneHourFromNow: string;
    oneDayFromNow: string;
    oneWeekFromNow: string;
    oneMonthFromNow: string;
    oneYearFromNow: string;
  };
  durations: {
    fiveMinutes: string;
    oneHour: string;
    oneDay: string;
    oneWeek: string;
    oneMonth: string;
    oneYear: string;
  };
}

export const getCurrentTimestampTool = {
  name: 'get_current_timestamp',
  description: 'Get current timestamp in milliseconds for time-dependent configurations. Includes helper values for common time offsets and durations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      offsetMs: {
        type: 'number',
        description: 'Optional offset in milliseconds to add to current time'
      },
      offsetDays: {
        type: 'number',
        description: 'Optional offset in days to add to current time'
      },
      offsetHours: {
        type: 'number',
        description: 'Optional offset in hours to add to current time'
      }
    },
    required: []
  }
};

const DURATION = {
  FIVE_MINUTES: 5 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000
};

const MAX_UINT64 = '18446744073709551615';

export function handleGetCurrentTimestamp(input: GetCurrentTimestampInput): GetCurrentTimestampResult {
  let now = Date.now();

  // Apply offsets
  if (input.offsetMs) {
    now += input.offsetMs;
  }
  if (input.offsetHours) {
    now += input.offsetHours * DURATION.ONE_HOUR;
  }
  if (input.offsetDays) {
    now += input.offsetDays * DURATION.ONE_DAY;
  }

  return {
    timestamp: String(now),
    timestampMs: now,
    isoDate: new Date(now).toISOString(),
    foreverEnd: MAX_UINT64,
    helpers: {
      fiveMinutesFromNow: String(now + DURATION.FIVE_MINUTES),
      oneHourFromNow: String(now + DURATION.ONE_HOUR),
      oneDayFromNow: String(now + DURATION.ONE_DAY),
      oneWeekFromNow: String(now + DURATION.ONE_WEEK),
      oneMonthFromNow: String(now + DURATION.ONE_MONTH),
      oneYearFromNow: String(now + DURATION.ONE_YEAR)
    },
    durations: {
      fiveMinutes: String(DURATION.FIVE_MINUTES),
      oneHour: String(DURATION.ONE_HOUR),
      oneDay: String(DURATION.ONE_DAY),
      oneWeek: String(DURATION.ONE_WEEK),
      oneMonth: String(DURATION.ONE_MONTH),
      oneYear: String(DURATION.ONE_YEAR)
    }
  };
}
