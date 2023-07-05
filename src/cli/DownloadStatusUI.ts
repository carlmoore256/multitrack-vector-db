import ProgressBar, { ProgressBarOptions } from 'progress';
import logUpdate from "log-update";
import { Debug } from '../utils/Debug.js';
import { DownloadManager } from '../downloading/DownloadManager.js';
import cliProgress, { MultiBar, Presets } from 'cli-progress';
import { DownloadJob } from '../downloading/DownloadJob.js';

const DEFAULT_BAR_OPTIONS : ProgressBarOptions = {
    total: 100,
    width: 50,
    complete: '█',
    incomplete: ' ',
    renderThrottle: 30,
    clear: true
}

export class DownloadStatusUI {
    private downloadManager: DownloadManager;
    private multibar : MultiBar;
    // private progressOptions = { width: 40, total: 100, complete: '=', incomplete: ' ' };
    // private bars: { [key: string]: ProgressBar } = {};
  
    constructor(downloadManager: DownloadManager) {
      this.downloadManager = downloadManager;
      this.multibar = new MultiBar({
        clearOnComplete: false,
        hideCursor: false,
        format: ' {bar} | {filename} | {value}/{total}',
      }, Presets.shades_grey);
      console.log("Created multibar" + this.multibar);

      this.downloadManager.onJobStartObservers.push(job => this.addJob(job));
      Debug.enableLogging = false;
    }


    private addJob(job : DownloadJob) {
        const bar = this.multibar.create(job.totalBytes || 0, 0, {filename: job.downloadPath});
        
        job.onProgressObservers.push((job : DownloadJob) => {
            bar.setTotal(job.totalBytes || 0);
            bar.update(job.downloadedBytes, {filename: job.downloadPath});
        });
        
        job.onCompleteObservers.push((job : DownloadJob) => {
            bar.stop();
            setTimeout(() => {
                // remove after 1 second
                this.multibar.remove(bar);
            }, 1000);
        });
    }
  }