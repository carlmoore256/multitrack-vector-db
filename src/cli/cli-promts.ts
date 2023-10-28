import { select, input } from '@inquirer/prompts';
import { Debug, LogColor } from '../utils/debug.js';
import chalk from 'chalk';

export type Choice<Value> = {
    value: Value;
    name?: string;
    description?: string;
    disabled?: boolean | string;
    type?: never;
};

export async function selectPrompt<T>(choices: Choice<T>[], message: string): Promise<T> {
    return await select({choices, message});
}

export async function yesNoPrompt(message: string): Promise<boolean> {
    return await selectPrompt([
        {value: true, name: 'Yes'},
        {value: false, name: 'No'}
    ], message);
}

export async function inputPrompt(message: string, defaultValue : string | null = null): Promise<string> {
    Debug.log(message);
    if (defaultValue) {
        return await input({message, default: defaultValue});
    } else {
        return await input({message});
    }
}

export async function queryInputPrompt(message : string, defaultQuery : string): Promise<string> {
    const query = await inputPrompt(message, defaultQuery);
    if (query.length < 3) {
        Debug.log('Using default query', LogColor.Red);
        return defaultQuery;
    }
    return query;
}

// use "$1", "$2", etc. for placeholders
export async function queryBuilderPrompt(message: string, queryTemplate: string, defaultValues: { [key: string]: string }): Promise<string> {
    let outputQuery = queryTemplate;
    while (true) {
        const formattedQuery = formatQuery(outputQuery, defaultValues);
        Debug.log(`Current query:\n${formattedQuery}`, LogColor.Yellow);
        var choices = Object.entries(defaultValues).map(([key, value], index) => ({
            value: key, // Value should be key itself
            name: `${key}: ${value}`,
        }))
        choices = [{ value: 'done', name: '[Done]' }, ...choices];

        let chosenKey = await selectPrompt<keyof typeof defaultValues | 'done'>(choices, message);
        if (chosenKey === 'done') {
            break;
        }
        
        const newValue = await inputPrompt(`Enter value for ${chosenKey}`, defaultValues[chosenKey]);
        defaultValues[chosenKey] = newValue;
        outputQuery = replaceWithIndex(outputQuery, `\$${Object.keys(defaultValues).indexOf(chosenKey as any) + 1}`, newValue);
    }
    // const query = await inputPrompt('Please review the query and press enter to confirm or edit it:', formatQuery(outputQuery, defaultValues));
    const sanitizedQuery = formatQuery(outputQuery, defaultValues).replace(/\s+/g, ' ').trim();
    return removeAnsiEscapeCodes(sanitizedQuery);
}

function formatQuery(query: string, values: { [key: string]: string }): string {
    let result = query;
    Object.entries(values).forEach(([key, value], index) => {
        result = result.replace(`\$${index + 1}`, chalk.green(value));
    });
    return result;
}

function replaceWithIndex(str: string, find: string, replaceWith: string): string {
    let index = 0;
    return str.replace(new RegExp(find, 'g'), (match: string) => {
        index++;
        return index === 1 ? replaceWith : match;
    });
}

function removeAnsiEscapeCodes(str: string) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
}


// use "$1", "$2", etc. for placeholders
// export async function queryBuilderPrompt(message: string, queryTemplate: string, defaultValues: { [key: string]: string }): Promise<string> {
//     let outputQuery = queryTemplate;
//     while (true) {
//         const formattedQuery = formatQuery(outputQuery, defaultValues);
//         Debug.log(`Current query:\n${formattedQuery}`, LogColor.Yellow);
//         const choices = Object.entries(defaultValues).map(([key, value], index) => ({
//             value: `${index}__key`,
//             name: `${key}: ${value}`,
//         })).concat({ value: 'done', name: 'Done' });

//         let chosenKey = await selectPrompt<keyof typeof defaultValues | 'done'>(choices, message);
//         if (chosenKey === 'done') {
//             break;
//         }
//         const chosenIndex = parseInt((chosenKey as string).split('__')[0]);
//         chosenKey = (chosenKey as string).split('__')[1] as keyof typeof defaultValues;
        
//         const newValue = await inputPrompt(`Enter value for ${chosenKey}`, defaultValues[chosenKey]);
//         defaultValues[chosenKey] = newValue;
//         outputQuery = outputQuery.replace(`$${chosenIndex + 1}`, newValue);
//     }
//     const query = await inputPrompt('Please review the query and press enter to confirm or edit it:', outputQuery);
//     return query;
// }

// function formatQuery(query: string, values: { [key: string]: string }): string {
//     let result = query;
//     Object.entries(values).forEach(([key, value], index) => {
//         result = result.replace(`$${index + 1}`, chalk.green(value));
//     });
//     return result;
// }


