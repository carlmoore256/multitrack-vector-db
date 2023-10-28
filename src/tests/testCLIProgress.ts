import { MultiBar, Presets } from 'cli-progress';

function test() {
    const multibar = new MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {bar} | {filename} | {value}/{total}',
    }, Presets.shades_grey);
    // add bars
    const b1 = multibar.create(200, 0);
    const b2 = multibar.create(1000, 0);
    let idx = 0;

    multibar.remove(b1);



    const interval = setInterval(() => {
        b1.increment();
        
        if (Math.random() > 0.5) {
            // b2.increment();
            // console.log("incrementing b2");
            b1.update(idx * 10, {filename: "helloworld.txt"});
        }

        b2.update(idx * 10, {filename: "test1.txt"});
        
        idx++;
        if (idx > 100) {
            multibar.stop();
            clearInterval(interval);
        }
    }, 100)

    // stop all bars
}


export default test;