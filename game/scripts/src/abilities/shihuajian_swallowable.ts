import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class shihuajian_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_shihuajian_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_shihuajian_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "medusa_split_shot";
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
            ModifierFunction.ON_ATTACK_LANDED,
            ModifierFunction.ON_ATTACK,
        ];
    }

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            let target = event.target as CDOTA_BaseNPC;
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            let projectile_speed = 1000;
            let Ability = attacker.FindAbilityByName("custom_OnProjectileHit");
            let effectName = "particles/units/heroes/hero_medusa/medusa_base_attack.vpcf"
            let attack_range = 600
            let count = 5
            if (attacker.IsRangedAttacker()) {
                effectName = attacker.GetRangedProjectileName()
                projectile_speed = attacker.GetProjectileSpeed()
                attack_range = attacker.Script_GetAttackRange()
            }
            let targets = FindUnitsInRadius(
                this.GetParent().GetTeamNumber(), // 敌人的队伍
                this.GetParent().GetAbsOrigin(), // 敌人的位置
                undefined, // 查找范围
                attack_range, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.CLOSEST, // 查找顺序
                false
            );
            //取5个
            for (let i = 0; i < count; i++) {
                let enemy = targets[i];
                if (enemy && enemy != target) {
                    ProjectileManager.CreateTrackingProjectile(
                        {
                            EffectName: effectName,
                            Ability: Ability,
                            Source: attacker,
                            bProvidesVision: false,
                            iVisionRadius: 0,
                            // iVisionTeamNumber: DOTATeam_t,
                            vSourceLoc: attacker.GetOrigin(),
                            Target: enemy,
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
            }
        }
    }

    OnAttackLanded(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            let target = event.target as CDOTA_BaseNPC;
            if (RollPseudoRandomPercentage(this.attack_chance, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                let damage = 100
                ApplyDamage({
                    victim: target,
                    attacker: attacker,
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.PHYSICAL,
                    damage_flags: DamageFlag.NONE,
                });
                target.AddNewModifier(this.GetParent(), this.GetAbility(), "modifier_shihuajian_debuff", { duration: 1.5, })
            }
        }
    }

    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
        if (target) {
            if (RollPseudoRandomPercentage(this.attack_chance, PseudoRandom.CUSTOM_GENERIC, this.GetParent())) {
                let damage = 100
                ApplyDamage({
                    victim: target,
                    attacker: this.GetParent(),
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.MAGICAL,
                    damage_flags: DamageFlag.NONE,
                });
                target.AddNewModifier(this.GetParent(), this.GetAbility(), "modifier_shihuajian_debuff", { duration: 1.5, })
            }
        }
        return false
    }

}


@registerModifier()
export class modifier_shihuajian_debuff extends BaseModifier {
    IsHidden(): boolean {
        return false
    }

    IsPurgable(): boolean {
        return false
    }

    RemoveOnDeath(): boolean {
        return true
    }

    IsDebuff(): boolean {
        return true
    }

    GetTexture() {
        return "medusa_split_shot";
    }

    // GetAttributes() {
    //     return ModifierAttribute.MULTIPLE
    // }

    OnCreated(params: object): void {
        if (!IsServer()) return;
        // this.IncrementStackCount();
        // const particleId2 = ParticleManager.CreateParticle(
        //     "particles/status_fx/status_effect_medusa_stone_gaze.vpcf",
        //     ParticleAttachment.POINT_FOLLOW,
        //     this.GetParent()
        // );
        // this.AddParticle(particleId2, false, true, 100, false, false)
    }
    OnRefresh(params: object): void {
        if (!IsServer()) return;
        // if (this.GetStackCount() < this.max_stack_count) {
        //     this.IncrementStackCount();
        // }
    }

    CheckState(): Partial<Record<modifierstate, boolean>> {
        return {
            [ModifierState.FROZEN]: true,
            [ModifierState.STUNNED]: true,
        };
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.INCOMING_PHYSICAL_DAMAGE_PERCENTAGE
        ]
    }

    GetModifierIncomingPhysicalDamage_Percentage(): number {
        return 50
    }

    GetEffectName() {
        return "particles/units/heroes/hero_medusa/medusa_stone_gaze_debuff_stoned.vpcf"
    }
    GetEffectAttachType() {
        return ParticleAttachment.POINT_FOLLOW;
    }
    GetStatusEffectName() {
        return "particles/status_fx/status_effect_medusa_stone_gaze.vpcf"
    }
    StatusEffectPriority() {
        return 100;
    }
}