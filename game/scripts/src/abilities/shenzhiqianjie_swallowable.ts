import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class shenzhiqianjie_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_shenzhiqianjie_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_shenzhiqianjie_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "mars_gods_rebuke";
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

    private attack_count: number = GetAbilityValues(this.ability_name, "attack_count");

    count: number = 0;
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
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            this.count++
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {

            if (this.count >= this.attack_count) {
                let direction = attacker.GetForwardVector();
                let tTargets = FindUnitsInRadius(
                    attacker.GetTeamNumber(),
                    attacker.GetAbsOrigin(),
                    null,
                    500,
                    UnitTargetTeam.ENEMY,
                    UnitTargetType.ALL,
                    UnitTargetFlags.NONE,
                    FindOrder.CLOSEST,
                    false,
                );

                tTargets = tTargets.filter(unit => {
                    //获取前方一定角度的范围内的敌人
                    let facing_direction = attacker.GetAnglesAsVector().y;
                    let unit_vector = ((unit.GetOrigin() - attacker.GetOrigin()) as Vector).Normalized();
                    let unit_direction = VectorToAngles(unit_vector).y;
                    let angle_diff = AngleDiff(facing_direction, unit_direction);
                    angle_diff = math.abs(angle_diff);
                    //前方左右各30度
                    if (angle_diff < 45) return unit;
                });

                for (const target of tTargets) {
                    let damage = 100
                    ApplyDamage({
                        victim: target,
                        attacker: attacker,
                        damage: damage,
                        ability: this.GetAbility(),
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
                }
                let effect_cast = ParticleManager.CreateParticle("particles/units/heroes/hero_mars/mars_shield_bash.vpcf",
                    ParticleAttachment.WORLDORIGIN, attacker)
                ParticleManager.SetParticleControl(effect_cast, 0, attacker.GetOrigin())
                ParticleManager.SetParticleControlForward(effect_cast, 0, direction)
                ParticleManager.ReleaseParticleIndex(effect_cast)
                EmitSoundOnLocationWithCaster(attacker.GetOrigin(), "Hero_Mars.Shield.Cast", attacker)


                this.count = 0;
            }
        }
    }

}

@registerModifier()
export class modifier_shenzhiqianjie_debuff extends BaseModifier {
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
        return "magnataur_shockwave";
    }

    // GetAttributes() {
    //     return ModifierAttribute.MULTIPLE
    // }

    OnCreated(params: object): void {
        if (!IsServer()) return;
        // this.IncrementStackCount();
    }
    OnRefresh(params: object): void {
        if (!IsServer()) return;
        // if (this.GetStackCount() < this.max_stack_count) {
        //     this.IncrementStackCount();
        // }
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.MOVESPEED_BONUS_PERCENTAGE
        ]
    }

    GetModifierMoveSpeedBonus_Percentage(): number {
        return -75
    }

    // GetEffectName() {
    //     return "particles/generic_gameplay/generic_slowed_cold.vpcf";
    // }
    // GetEffectAttachType() {
    //     return ParticleAttachment.POINT_FOLLOW;
    // }
}