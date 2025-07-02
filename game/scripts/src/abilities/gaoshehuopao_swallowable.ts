import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class gaoshehuopao_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_gaoshehuopao_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_gaoshehuopao_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "gyrocopter_flak_cannon";
    }

    RemoveOnDeath(): boolean {
        return false
    }

    IsDebuff(): boolean {
        return false
    }

    override IsPurgable(): boolean {
        return false;
    }

    private ability_name = this.GetName().replace("modifier_", "")
    private interval: number = 0.1;
    private cd_remaining: number = 0;

    private original_duration: number = GetAbilityValues(this.ability_name, "duration");
    private original_radius: number = GetAbilityValues(this.ability_name, "radius");
    private original_aoe_radius: number = GetAbilityValues(this.ability_name, "aoe_radius");
    private original_cd: number = GetAbilityCooldown(this.ability_name);

    private damage_int_mult: number = GetAbilityValues(this.ability_name, "damage_int_mult");
    private damage_frost_mult: number = GetAbilityValues(this.ability_name, "damage_frost_mult");
    private frost_stack: number = GetAbilityValues(this.ability_name, "frost_stack");

    private attack_chance: number = GetAbilityValues(this.ability_name, "attack_chance");

    // private original_cd: number = 10;
    // private original_duration = 5;
    // private original_radius = 810;
    // private original_aoe_radius = 320;

    override OnCreated(params: object): void {
        if (!IsServer()) return;
    }

    DeclareFunctions() {
        return [
            // ModifierFunction.ON_ATTACK_LANDED,
            ModifierFunction.ON_ATTACK,
        ];
    }

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent() && !event.no_attack_cooldown) {//!event.no_attack_cooldown，判断是否是PerformAttack
            let attacker = event.attacker as CDOTA_BaseNPC;
            // Object.keys(event).forEach(key => {
            //     print(key, event[key])
            // })
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(this.attack_chance, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                let projectile_speed = 1000;
                let Ability = attacker.FindAbilityByName("custom_OnProjectileHit");
                let effectName = "particles/econ/items/gyrocopter/hero_gyrocopter_gyrotechnics/gyro_base_attack.vpcf"

                const targets = FindUnitsInRadius(
                    this.GetParent().GetTeamNumber(), // 敌人的队伍
                    this.GetParent().GetAbsOrigin(), // 敌人的位置
                    undefined, // 查找范围
                    1250, // 查找范围
                    UnitTargetTeam.ENEMY, // 查找敌人
                    UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                    UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                    FindOrder.CLOSEST, // 查找顺序
                    false
                );
                // targets.forEach(enemy => {
                //     attacker.PerformAttack(enemy, false, false, true, true, true, false, false)
                // })
                for (const target of targets) {
                    ProjectileManager.CreateTrackingProjectile(
                        {
                            EffectName: effectName,
                            Ability: Ability,
                            Source: attacker,
                            bProvidesVision: false,
                            iVisionRadius: 0,
                            // iVisionTeamNumber: DOTATeam_t,
                            vSourceLoc: attacker.GetOrigin(),
                            Target: target,
                            iMoveSpeed: projectile_speed,
                            flExpireTime: GameRules.GetGameTime() + 10,
                            bDodgeable: false,
                            bIsAttack: false,

                            ExtraData: {
                                name: this.GetName(),
                                danage: 100,
                                damage_type: DamageTypes.MAGICAL,
                            },
                        }
                    )
                }
                attacker.EmitSound("Hero_Gyrocopter.FlackCannon")

                Timers.CreateTimer(0.5, () => {
                    const targets = FindUnitsInRadius(
                        this.GetParent().GetTeamNumber(), // 敌人的队伍
                        this.GetParent().GetAbsOrigin(), // 敌人的位置
                        undefined, // 查找范围
                        1200, // 查找范围
                        UnitTargetTeam.ENEMY, // 查找敌人
                        UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                        UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                        FindOrder.CLOSEST, // 查找顺序
                        false
                    );
                    for (const target of targets) {
                        ProjectileManager.CreateTrackingProjectile(
                            {
                                EffectName: effectName,
                                Ability: Ability,
                                Source: attacker,
                                bProvidesVision: false,
                                iVisionRadius: 0,
                                // iVisionTeamNumber: DOTATeam_t,
                                vSourceLoc: attacker.GetOrigin(),
                                Target: target,
                                iMoveSpeed: projectile_speed,
                                flExpireTime: GameRules.GetGameTime() + 10,
                                bDodgeable: false,
                                bIsAttack: false,

                                ExtraData: {
                                    name: this.GetName(),
                                    danage: 100,
                                    damage_type: DamageTypes.MAGICAL,
                                },
                            }
                        )
                    }
                    attacker.EmitSound("Hero_Gyrocopter.FlackCannon")
                })
            }

        }
    }

    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
        if (target) {
            ApplyDamage({
                victim: target,
                attacker: this.GetParent(),
                damage: 100,
                ability: this.GetAbility(),
                damage_type: DamageTypes.PHYSICAL,
                damage_flags: DamageFlag.NONE,
            });
        }
        return false
    }
}


