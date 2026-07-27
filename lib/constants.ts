// App Constants
// Centraliza valores mágicos para fácil manutenção e configuração

// Sync
export const SYNC_INTERVAL_MS = 15_000; // 15 segundos
export const SYNC_CONCURRENCY = 3; // uploads paralelos

// Inatividade
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

// Armazenamento
export const STORAGE_WARNING_PCT = 85; // alerta quando > 85% cheio

// GPS
export const GPS_TIMEOUT_MS = 5_000; // 5 segundos
export const GPS_MAX_AGE_MS = 60_000; // 1 minuto

// Touch/Drag
export const TOUCH_SENSOR_DELAY = 200; // ms
export const TOUCH_SENSOR_TOLERANCE = 8; // px

// Alertas
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// UI
export const SEARCH_DEBOUNCE_MS = 200;
export const TOAST_DURATION_MS = 5_000;
export const TOAST_ERROR_DURATION_MS = 8_000;
