const global = globalThis as typeof globalThis & {
    reloadCache: Record<string, any>;
};
if (global.reloadCache === undefined) {
    global.reloadCache = {};
}

export function reloadable<T extends { new(...args: any[]): {} }>(constructor: T): T {
    const className = constructor.name;
    if (global.reloadCache[className] === undefined) {
        global.reloadCache[className] = constructor;
    }

    Object.assign(global.reloadCache[className].prototype, constructor.prototype);
    return global.reloadCache[className];
}



export function GetAbilityCooldown(ability_name: string) {
    return GameRules.AllAbility?.[ability_name]?.["AbilityCooldown"] ?? "-1";
}
export function GetAbilityValues(ability_name: string, key: string) {
    return GameRules.AllAbility?.[ability_name]?.["AbilityValues"]?.[key] ?? "-1";
}
