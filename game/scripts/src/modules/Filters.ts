import { reloadable } from '../utils/tstl-utils';

@reloadable
export class Filters {


    constructor() {
        const game: CDOTABaseGameMode = GameRules.GetGameModeEntity();
        // game.SetDamageFilter((keys) => this.DamageFilter(keys), this);
        game.SetModifierGainedFilter((keys) => this.ModifierFilter(keys), this);
        game.SetExecuteOrderFilter((keys) => this.OrderFilter(keys), this);
        game.SetModifyGoldFilter((keys) => this.ModifyGoldFilter(keys), this);
        game.SetModifyExperienceFilter((keys) => this.ModifyExpFilter(keys), this);
        // game.SetHealingFilter((keys) => this.HealingFilter(keys), this);
        // game.SetItemAddedToInventoryFilter((keys) => this.ItemAddToInventoryFilter(keys), this);
    }

    private DamageFilter(filterTable: DamageFilterEvent): boolean {
        if (!filterTable.entindex_attacker_const) return true;
        if (!filterTable.entindex_victim_const) return true;
        let attacker = EntIndexToHScript(filterTable.entindex_attacker_const) as CDOTA_BaseNPC;
        let victim = EntIndexToHScript(filterTable.entindex_victim_const) as CDOTA_BaseNPC;
        let ability = EntIndexToHScript(filterTable.entindex_inflictor_const ?? -1 as EntityIndex) as CDOTABaseAbility;
        // if (!IsValidAlive(victim)) return;
        if (filterTable.damage == 0) return;
        return true
    }

    private ModifyGoldFilter(filterTable: ModifyGoldFilterEvent) {
        filterTable.player_id_const
        if (filterTable.player_id_const == 0) {
            // print("ModifierFilter ==", filterTable.gold)
        }
        return true
    }

    private ModifyExpFilter(filterTable: ModifyExperienceFilterEvent) {
        let hero = EntIndexToHScript(filterTable.hero_entindex_const) as CDOTA_BaseNPC;
        if (hero.IsRealHero() && filterTable.player_id_const == 0) {
            // print("ModifyExpFilter ==", filterTable.experience)
        }
        return true
    }

    private ModifierFilter(filterTable: ModifierGainedFilterEvent) {
        let parent = EntIndexToHScript(filterTable.entindex_parent_const) as CDOTA_BaseNPC;
        if (parent.IsRealHero()) {
            // print("ModifierFilter ==", filterTable.name_const)
        }
        return true
    }

    private OrderFilter(event: ExecuteOrderFilterEvent) {

        //矢量施法-获取二段坐标
        if (event.units["0"]) {
            let unit = EntIndexToHScript(event.units["0"])
            let ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility
            let target = EntIndexToHScript(event.entindex_target) as CDOTA_BaseNPC

            if (!ability || !ability.GetBehaviorInt()) {
                return true
            }

            let behavior = ability.GetBehaviorInt()
            if ((behavior & AbilityBehavior.VECTOR_TARGETING) == AbilityBehavior.VECTOR_TARGETING) {
                if (event.order_type == UnitOrder.VECTOR_TARGET_POSITION) {
                    //@ts-ignore
                    ability.vectorTargetPosition2 = Vector(event.position_x, event.position_y, 0)
                    // print("VectorTargetPosition2", Vector(event.position_x, event.position_y, 0))
                }
            }
            if ((behavior & AbilityBehavior.VECTOR_TARGETING) == AbilityBehavior.VECTOR_TARGETING) {
                if (event.order_type == UnitOrder.CAST_POSITION) {
                    //@ts-ignore
                    ability.vectorTargetPosition = Vector(event.position_x, event.position_y, 0)
                    // print("VectorTargetPosition1", Vector(event.position_x, event.position_y, 0))
                    //@ts-ignore
                    let position = ability.vectorTargetPosition
                    //@ts-ignore
                    let position2 = ability.vectorTargetPosition2

                    let direction = (position2 - position as Vector).Normalized()
                    function OverrideSpellStart(self: any, position: Vector, direction: Vector): void {
                        self.OnVectorCastStart(position, direction);
                    }
                    // 为 ability 对象的 OnSpellStart 方法赋值
                    ability.OnSpellStart = function (this: any): void {
                        return OverrideSpellStart(this, position, direction);
                    };
                }

                if (event.order_type == UnitOrder.CAST_TARGET) {
                    if (target) {
                        //@ts-ignore
                        ability.vectorTargetPosition = target.GetAbsOrigin()
                    }
                    // print("VectorTargetPosition1", Vector(event.position_x, event.position_y, 0))
                    //@ts-ignore
                    let position = ability.vectorTargetPosition
                    //@ts-ignore
                    let position2 = ability.vectorTargetPosition2

                    let direction = (position2 - position as Vector).Normalized()
                    function OverrideSpellStart(ability: any, position: Vector, direction: Vector, target?: CDOTA_BaseNPC): void {
                        ability.OnVectorCastStart(position, direction, target);
                    }
                    // 为 ability 对象的 OnSpellStart 方法赋值
                    ability.OnSpellStart = function (this: any): void {
                        return OverrideSpellStart(this, position, direction, target);
                    };
                }

                // let OverrideSpellStart = function (v1 = 1, v2 = 2) { }

                // //@ts-ignore
                // ability.OnSpellStart = ability.OnVectorCastStart

                // local function OverrideSpellStart(self)
                //     self:OnVectorCastStart()
                // end
                // ability.OnSpellStart = function(self) return OverrideSpellStart(self) end

                // local function OverrideSpellStart(self, position, direction)
                // self: OnVectorCastStart(position, direction)
                // end
                // ability.OnSpellStart = function (self) return OverrideSpellStart(self, position, direction) end
            }
            // print("order_type===", event.order_type)
        }


        return true
    }


}