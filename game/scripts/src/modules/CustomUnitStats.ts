import { reloadable } from '../utils/tstl-utils';

declare global {
    interface CDOTA_BaseNPC {
        GetCustomStat(statName: string): number;
        SetCustomStat(statName: string, value: number): void;
        ModifyCustomStat(statName: string, delta: number): number;

        // 动态生成的方法（基于注册的属性）
        GetLuck?(): number;
        GetCritDamage?(): number;
        GetMagicPenetration?(): number;
    }
}

declare interface UnitMetaTable {
    GetCustomStat: (this: CDOTA_BaseNPC, statName: string) => number;
    SetCustomStat: (this: CDOTA_BaseNPC, statName: string, value: number) => void;
    ModifyCustomStat: (this: CDOTA_BaseNPC, statName: string, delta: number) => number;
    [key: string]: any;
}

// 扩展 Dota 2 单位类型


/**
 * 自定义单位属性管理系统
 * 提供类似力量、敏捷、智力的自定义属性，支持动态修改和API访问
 */
export class CustomUnitStats {
    // 单例实例
    private static instance: CustomUnitStats;

    // 属性存储
    private unitStats: Map<CDOTA_BaseNPC, UnitStats>;

    // 注册的自定义属性
    private registeredStats: Map<string, CustomStatDefinition>;

    // 事件监听器
    private eventListeners: Map<string, Function[]>;

    private constructor() {
        this.unitStats = new Map();
        this.registeredStats = new Map();
        this.eventListeners = new Map();

        this.initialize();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): CustomUnitStats {
        if (!CustomUnitStats.instance) {
            CustomUnitStats.instance = new CustomUnitStats();
        }
        return CustomUnitStats.instance;
    }

    /**
     * 初始化系统
     */
    private initialize(): void {
        this.extendUnitClass();
        this.registerGameEvents();
        this.registerDefaultStats();

        print("[CustomUnitStats] System initialized");
    }

    /**
     * 扩展单位类，添加自定义属性访问方法
     */
    private extendUnitClass(): void {
        const unitMetaTable = getmetatable(CDOTA_BaseNPC).__index as UnitMetaTable;

        // 通用属性获取方法
        unitMetaTable.GetCustomStat = function (this: CDOTA_BaseNPC, statName: string): number {
            const instance = CustomUnitStats.getInstance();
            return instance.getUnitStat(this, statName);
        };

        unitMetaTable.SetCustomStat = function (this: CDOTA_BaseNPC, statName: string, value: number): void {
            const instance = CustomUnitStats.getInstance();
            instance.setUnitStat(this, statName, value);
        };

        unitMetaTable.ModifyCustomStat = function (this: CDOTA_BaseNPC, statName: string, delta: number): number {
            const instance = CustomUnitStats.getInstance();
            return instance.modifyUnitStat(this, statName, delta);
        };

        // 为每个已注册的属性生成专用方法
        this.registeredStats.forEach((definition, statName) => {
            const methodName = `Get${this.capitalizeFirst(statName)}`;
            unitMetaTable[methodName] = function (this: CDOTA_BaseNPC): number {
                const instance = CustomUnitStats.getInstance();
                return instance.getUnitStat(this, statName);
            };
        });
    }

    /**
     * 注册游戏事件
     */
    private registerGameEvents(): void {
        // 单位生成事件
        ListenToGameEvent("npc_spawned", (event: NpcSpawnedEvent) => {
            const unit = EntIndexToHScript(event.entindex) as CDOTA_BaseNPC;
            if (unit && unit.IsRealHero()) {
                this.initializeUnitStats(unit);
            }
        }, undefined);

        // 单位死亡事件（清理内存）
        ListenToGameEvent("entity_killed", (event: EntityKilledEvent) => {
            const unit = EntIndexToHScript(event.entindex_killed) as CDOTA_BaseNPC;
            if (unit && this.unitStats.has(unit)) {
                // this.unitStats.delete(unit);
            }
        }, undefined);
    }

    /**
     * 注册默认属性
     */
    private registerDefaultStats(): void {
        // 注册幸运属性
        this.registerStat("luck", {
            displayName: "Luck",
            defaultValue: 0,
            minValue: -100,
            maxValue: 100,
            description: "Affects critical strike chance and other random events"
        });

        // 注册暴击伤害属性
        this.registerStat("crit_damage", {
            displayName: "Critical Damage",
            defaultValue: 0,
            minValue: 0,
            maxValue: 500,
            description: "Bonus critical strike damage multiplier"
        });

        // 注册魔法穿透属性
        this.registerStat("magic_penetration", {
            displayName: "Magic Penetration",
            defaultValue: 0,
            minValue: 0,
            maxValue: 100,
            description: "Reduces enemy magic resistance"
        });
    }

    /**
     * 注册新的自定义属性
     */
    public registerStat(statName: string, definition: CustomStatDefinition): boolean {
        if (this.registeredStats.has(statName)) {
            print(`[CustomUnitStats] Stat '${statName}' is already registered`);
            return false;
        }

        this.registeredStats.set(statName, definition);

        // 为这个属性动态生成专用获取方法
        const unitMetaTable = getmetatable(CDOTA_BaseNPC).__index;
        const methodName = `Get${this.capitalizeFirst(statName)}`;

        if (!unitMetaTable[methodName]) {
            unitMetaTable[methodName] = function (this: CDOTA_BaseNPC): number {
                const instance = CustomUnitStats.getInstance();
                return instance.getUnitStat(this, statName);
            };
        }

        print(`[CustomUnitStats] Registered new stat: ${statName}`);
        return true;
    }

    /**
     * 初始化单位的属性存储
     */
    public initializeUnitStats(unit: CDOTA_BaseNPC): void {
        if (!unit || unit.IsNull() || this.unitStats.has(unit)) return;

        const stats: UnitStats = {};

        // 使用注册属性的默认值初始化
        this.registeredStats.forEach((definition, statName) => {
            stats[statName] = definition.defaultValue;
        });

        this.unitStats.set(unit, stats);

        // 触发初始化事件
        this.triggerEvent("unit_stats_initialized", { unit, stats });
    }

    /**
     * 获取单位属性值
     */
    public getUnitStat(unit: CDOTA_BaseNPC, statName: string): number {
        // 确保单位已初始化
        if (!this.unitStats.has(unit)) {
            this.initializeUnitStats(unit);
        }

        const stats = this.unitStats.get(unit);
        const definition = this.registeredStats.get(statName);

        if (!stats || !definition) {
            print(`[CustomUnitStats] Stat '${statName}' not found for unit`);
            return 0;
        }

        return stats[statName] || definition.defaultValue;
    }

    /**
     * 设置单位属性值
     */
    public setUnitStat(unit: CDOTA_BaseNPC, statName: string, value: number): void {
        // 确保单位已初始化
        if (!this.unitStats.has(unit)) {
            this.initializeUnitStats(unit);
        }

        const stats = this.unitStats.get(unit);
        const definition = this.registeredStats.get(statName);

        if (!stats || !definition) {
            print(`[CustomUnitStats] Cannot set stat '${statName}' - not registered`);
            return;
        }

        // 应用值限制
        const clampedValue = this.clampValue(value, definition.minValue, definition.maxValue);
        const oldValue = stats[statName] || definition.defaultValue;

        stats[statName] = clampedValue;
        this.unitStats.set(unit, stats);

        // 触发属性变更事件
        this.triggerEvent("stat_changed", {
            unit,
            statName,
            oldValue,
            newValue: clampedValue,
            definition
        });
    }

    /**
     * 修改单位属性值（增减）
     */
    public modifyUnitStat(unit: CDOTA_BaseNPC, statName: string, delta: number): number {
        const currentValue = this.getUnitStat(unit, statName);
        const newValue = currentValue + delta;

        this.setUnitStat(unit, statName, newValue);

        return newValue;
    }

    /**
     * 获取单位所有属性
     */
    public getAllUnitStats(unit: CDOTA_BaseNPC): UnitStats {
        if (!this.unitStats.has(unit)) {
            this.initializeUnitStats(unit);
        }

        return { ...this.unitStats.get(unit)! };
    }

    /**
     * 获取属性定义
     */
    public getStatDefinition(statName: string): CustomStatDefinition | undefined {
        return this.registeredStats.get(statName);
    }

    /**
     * 获取所有已注册的属性
     */
    public getRegisteredStats(): Map<string, CustomStatDefinition> {
        return new Map(this.registeredStats);
    }

    /**
     * 注册事件监听器
     */
    public on(eventName: string, callback: Function): void {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }

        this.eventListeners.get(eventName)!.push(callback);
    }

    /**
     * 触发事件
     */
    private triggerEvent(eventName: string, data: any): void {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    print(`[CustomUnitStats] Error in event listener for ${eventName}: ${error}`);
                }
            });
        }
    }

    /**
     * 工具函数：首字母大写
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * 工具函数：限制数值范围
     */
    private clampValue(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 调试：打印单位的所有属性
     */
    public debugPrintUnitStats(unit: CDOTA_BaseNPC): void {
        if (!this.unitStats.has(unit)) {
            print(`[CustomUnitStats] No stats found for unit`);
            return;
        }

        const stats = this.unitStats.get(unit)!;
        print(`[CustomUnitStats] Stats for ${unit.GetUnitName()}:`);

        Object.keys(stats).forEach(statName => {
            const value = stats[statName];
            const definition = this.registeredStats.get(statName);
            const displayName = definition ? definition.displayName : statName;

            print(`  ${displayName}: ${value}`);
        });
    }
}

/**
 * 初始化自定义属性系统
 */
export function InitializeCustomUnitStats(): CustomUnitStats {
    return CustomUnitStats.getInstance();
}

/**
 * 快速访问函数 - 获取单位属性
 */
function GetUnitCustomStat(unit: CDOTA_BaseNPC, statName: string): number {
    return CustomUnitStats.getInstance().getUnitStat(unit, statName);
}

/**
 * 快速访问函数 - 设置单位属性
 */
function SetUnitCustomStat(unit: CDOTA_BaseNPC, statName: string, value: number): void {
    CustomUnitStats.getInstance().setUnitStat(unit, statName, value);
}

/**
 * 快速访问函数 - 修改单位属性
 */
function ModifyUnitCustomStat(unit: CDOTA_BaseNPC, statName: string, delta: number): number {
    return CustomUnitStats.getInstance().modifyUnitStat(unit, statName, delta);
}

/**
 * 快速访问函数 - 注册新属性
 */
function RegisterCustomStat(statName: string, definition: CustomStatDefinition): boolean {
    return CustomUnitStats.getInstance().registerStat(statName, definition);
}

// 导出单例访问函数
// declare let global: any;
declare global {
    function GetUnitCustomStat(...args: any[]): any;
    function SetUnitCustomStat(...args: any[]): any;
    function ModifyUnitCustomStat(unit: CDOTA_BaseNPC, statName: string, delta: number): number
    function RegisterCustomStat(...args: any[]): any;
}

// 全局导出
globalThis.InitializeCustomUnitStats = InitializeCustomUnitStats;
globalThis.GetUnitCustomStat = GetUnitCustomStat;
globalThis.SetUnitCustomStat = SetUnitCustomStat;
globalThis.ModifyUnitCustomStat = ModifyUnitCustomStat;
globalThis.RegisterCustomStat = RegisterCustomStat;

// 类型定义扩展
interface CustomStatDefinition {
    displayName: string;
    defaultValue: number;
    minValue: number;
    maxValue: number;
    description: string;
}

interface UnitStats {
    [statName: string]: number;
}


// 使用示例


// // 1. 初始化系统
// const statsSystem = InitializeCustomUnitStats();

// // 2. 注册新属性
// RegisterCustomStat("attack_speed_bonus", {
//     displayName: "Attack Speed Bonus",
//     defaultValue: 0,
//     minValue: -80,
//     maxValue: 500,
//     description: "Additional attack speed percentage"
// });

// // 3. 在游戏中使用
// function OnGameStart(): void {
//     // 获取英雄并设置属性
//     const hero = Players.GetPlayerHeroEntityIndex(0);
    
//     // 方法1: 使用通用API
//     hero.SetCustomStat("luck", 15);
//     hero.ModifyCustomStat("crit_damage", 25);
    
//     // 方法2: 使用专用方法（自动生成）
//     const luck = hero.GetLuck(); // 返回 15
//     const critDamage = hero.GetCritDamage(); // 返回 25
    
//     // 方法3: 使用快速访问函数
//     SetUnitCustomStat(hero, "attack_speed_bonus", 30);
//     const attackSpeed = GetUnitCustomStat(hero, "attack_speed_bonus"); // 返回 30
// }

// // 4. 监听属性变化
// statsSystem.on("stat_changed", (data: any) => {
//     print(`Stat ${data.statName} changed from ${data.oldValue} to ${data.newValue} for ${data.unit.GetUnitName()}`);
// });

// // 5. 在Modifier中使用
// class modifier_custom_luck_buff extends CDOTA_Modifier_Lua {
//     public luck_bonus: number = 0;
    
//     public OnCreated(params: { luck_bonus?: number }): void {
//         if (IsServer()) {
//             this.luck_bonus = params.luck_bonus || 10;
//             const parent = this.GetParent();
            
//             // 增加幸运值
//             parent.ModifyCustomStat("luck", this.luck_bonus);
//         }
//     }
    
//     public OnDestroy(): void {
//         if (IsServer()) {
//             const parent = this.GetParent();
            
//             // 移除幸运加成
//             parent.ModifyCustomStat("luck", -this.luck_bonus);
//         }
//     }
// }