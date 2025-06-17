import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class tongkujianjiao_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_tongkujianjiao_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_tongkujianjiao_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "queenofpain_scream_of_pain";
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

    // private original_cd: number = 10;
    // private original_duration = 5;
    // private original_radius = 810;
    // private original_aoe_radius = 320;

    override OnCreated(params: object): void {
        if (!IsServer()) return;
        this.StartIntervalThink(this.interval)

        // print("OnCreated", this.damage_int_mult)
        // print("OnCreated", this.damage_frost_mult)
        // print("OnCreated", this.frost_stack)
    }

    DeclareFunctions() {
        return [
            // ModifierFunction.ON_ATTACK_LANDED,
            ModifierFunction.ON_ATTACK,
        ];
    }
    Thinkers: CDOTA_BaseNPC[] = []
    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent()
        // if (!parent.IsAlive()) { return }

        //冷却缩减
        let cd_red = parent.GetCooldownReduction()
        let cd = this.original_cd * cd_red
        let duration = this.original_duration
        let radius = this.original_radius
        let aoe_radius = this.original_aoe_radius

        this.cd_remaining -= this.interval
        if (this.cd_remaining <= 0 && parent.IsAlive()) {
            //释放技能
            const targets = FindUnitsInRadius(
                this.GetParent().GetTeamNumber(), // 敌人的队伍
                this.GetParent().GetAbsOrigin(), // 敌人的位置
                undefined, // 查找范围
                600, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.CLOSEST, // 查找顺序
                false
            );

            let projectile_speed = 1000;
            let effectName = "particles/units/heroes/hero_queenofpain/queen_scream_of_pain.vpcf";
            let Ability = parent.FindAbilityByName("custom_OnProjectileHit")

            if (targets.length > 0) {
                let scream_pfx = ParticleManager.CreateParticle("particles/units/heroes/hero_queenofpain/queen_scream_of_pain_owner.vpcf", 
                    ParticleAttachment.ABSORIGIN, 
                    parent)
                ParticleManager.SetParticleControl(scream_pfx, 0, parent.GetAbsOrigin())
                ParticleManager.ReleaseParticleIndex(scream_pfx)


                for (const target of targets) {
                    ProjectileManager.CreateTrackingProjectile(
                        {
                            EffectName: effectName,
                            Ability: Ability,
                            Source: parent,
                            bProvidesVision: false,
                            iVisionRadius: 0,
                            // iVisionTeamNumber: DOTATeam_t,
                            vSourceLoc: parent.GetOrigin(),
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
                        // {
                        //     EffectName: effectName,
                        //     Ability: Ability,
                        //     Source: parent,
                        //     // bProvidesVision?: boolean;
                        //     // iVisionRadius?: number;
                        //     // iVisionTeamNumber?: DOTATeam_t;
                        //     ExtraData: {
                        //         name: this.GetName(),
                        //         danage: 100,
                        //         damage_type: DamageTypes.MAGICAL,
                        //     },

                        //     // vSourceLoc?: Vector;
                        //     Target: target,
                        //     iMoveSpeed: 800,
                        //     flExpireTime: GameRules.GetGameTime() + 5,,
                        //     bDodgeable: false,
                        //     bIsAttack: false,
                        //     // bReplaceExisting?: boolean;
                        //     // bIgnoreObstructions?: boolean;
                        //     // bSuppressTargetCheck?: boolean;
                        //     // iSourceAttachment?: DOTAProjectileAttachment_t;
                        //     // bDrawsOnMinimap?: boolean;
                        //     // bVisibleToEnemies?: boolean;

                        // }
                    )
                }
                parent.EmitSound("Hero_QueenOfPain.ScreamOfPain")
            } else {
                return
            }

            //重置cd
            this.cd_remaining = cd
            if (this.GetAbility()) {
                this.GetAbility().StartCooldown(cd)
            }
        }
    }
}


