export interface ITableColumn {
    key : string;
    type : string;
    nullable : boolean;
    primary : boolean;
}

export function splitColumns(sql : string) : string[] {
    return (sql.match(/\(([\s\S]+)\)/) as any)[1].split(',')
}

export function parseColumns(sql : string) : ITableColumn[] {
    const splits = splitColumns(sql);
    const columns : ITableColumn[] = [];
    for (const split of splits) {
        const [key, type, ...rest] = split.trim().split(' ');
        const nullable = (rest.includes('NOT') && rest.includes('NULL')) ? false : true;
        columns.push({
            key,
            type,
            nullable,
            primary : rest.includes('PRIMARY'),
        });
    }
    return columns;
}