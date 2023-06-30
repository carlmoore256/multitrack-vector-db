import ProgressBar, { ProgressBarOptions } from 'progress';
import logUpdate from "log-update";
import { Debug } from '../utils/Debug.js';

const DEFAULT_BAR_OPTIONS : ProgressBarOptions = {
    total: 100,
    width: 50,
    complete: '█',
    incomplete: ' ',
    renderThrottle: 30,
    clear: true
}

interface DebugPBar {
    update: () => void;
    cancel: () => void;
    started: boolean;
}

export function debugPBar(count: number, options: ProgressBarOptions = DEFAULT_BAR_OPTIONS, includeDebug: boolean = true): DebugPBar {
    options.total = count;
    const pbar = new ProgressBar('[:bar] :current/:total :percent :etas', options);

    let started = false;
    
    const increment = () => {
        if (!started) {
            if (includeDebug) {
                Debug.enableLogging = false;
            }
            started = true;
        }
        pbar.tick();
        if (!includeDebug) return;
        const logs = Debug.getBackLog(true);
        logUpdate(`\n${logs.join('\n')}\nCrawling Forums - Progress:\n${pbar.complete ? '\nComplete' : pbar.curr + '/' + pbar.total}\n${pbar.toString()}`);

        if (pbar.complete) {
            Debug.enableLogging = true;
        }
    }

    const cancel = () => {
        if (includeDebug) {
            Debug.enableLogging = true;
        }
    }

    return {
        update: increment,
        cancel,
        started
    }
}



