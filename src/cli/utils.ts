import logUpdate from 'log-update';


export function printStreamedResponse(allText: string) {
    logUpdate(`${allText}`);
}

export function renderCLIText(text: string) {
    logUpdate(`${text}`);
}