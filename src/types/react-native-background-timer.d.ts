declare module 'react-native-background-timer' {
    export function start(delay?: number): number;
    export function stop(id: number): void;
    export function runBackgroundTimer(callback: () => void, delay: number): void;
    export function stopBackgroundTimer(): void;
    export function setTimeout(callback: () => void, timeout: number): number;
    export function clearTimeout(timeoutId: number): void;
    export function setInterval(callback: () => void, timeout: number): number;
    export function clearInterval(intervalId: number): void;
}
