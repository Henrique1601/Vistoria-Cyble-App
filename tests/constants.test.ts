import { describe, it, expect } from 'vitest';
import {
  SYNC_INTERVAL_MS,
  SYNC_CONCURRENCY,
  INACTIVITY_TIMEOUT_MS,
  STORAGE_WARNING_PCT,
  GPS_TIMEOUT_MS,
  GPS_MAX_AGE_MS,
  TOUCH_SENSOR_DELAY,
  TOUCH_SENSOR_TOLERANCE,
  MS_PER_DAY,
  SEARCH_DEBOUNCE_MS,
  TOAST_DURATION_MS,
  TOAST_ERROR_DURATION_MS,
} from '@/lib/constants';

describe('Constants', () => {
  it('SYNC_INTERVAL_MS = 15s', () => {
    expect(SYNC_INTERVAL_MS).toBe(15_000);
  });

  it('SYNC_CONCURRENCY = 3', () => {
    expect(SYNC_CONCURRENCY).toBe(3);
  });

  it('INACTIVITY_TIMEOUT_MS = 30 min', () => {
    expect(INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  it('STORAGE_WARNING_PCT = 85', () => {
    expect(STORAGE_WARNING_PCT).toBe(85);
  });

  it('GPS_TIMEOUT_MS = 5s', () => {
    expect(GPS_TIMEOUT_MS).toBe(5_000);
  });

  it('GPS_MAX_AGE_MS = 60s', () => {
    expect(GPS_MAX_AGE_MS).toBe(60_000);
  });

  it('TOUCH_SENSOR_DELAY = 200ms', () => {
    expect(TOUCH_SENSOR_DELAY).toBe(200);
  });

  it('TOUCH_SENSOR_TOLERANCE = 8px', () => {
    expect(TOUCH_SENSOR_TOLERANCE).toBe(8);
  });

  it('MS_PER_DAY = 86400000', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });

  it('SEARCH_DEBOUNCE_MS = 200ms', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(200);
  });

  it('TOAST_DURATION_MS = 5s', () => {
    expect(TOAST_DURATION_MS).toBe(5_000);
  });

  it('TOAST_ERROR_DURATION_MS = 8s', () => {
    expect(TOAST_ERROR_DURATION_MS).toBe(8_000);
  });
});
