import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class daozhenxuanfeng_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_daozhenxuanfeng_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_daozhenxuanfeng_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "phantom_assassin_fan_of_knives";
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
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(this.attack_chance, PseudoRandom.CUSTOM_GENERIC, attacker)) {

                //冷却缩减
                let cd_red = attacker.GetCooldownReduction()
                let cd = this.original_cd * cd_red
                let duration = this.original_duration
                let radius = this.original_radius
                let aoe_radius = this.original_aoe_radius

                let enemies = FindUnitsInRadius(
                    attacker.GetTeamNumber(),
                    attacker.GetAbsOrigin(),
                    undefined,
                    500,
                    UnitTargetTeam.ENEMY,
                    UnitTargetType.HERO + UnitTargetType.BASIC,
                    UnitTargetFlags.NONE,
                    FindOrder.ANY,
                    false
                );
                enemies.forEach(enemy => {
                    //计算伤害
                    let damage = 100
                    ApplyDamage({
                        victim: enemy,
                        attacker: attacker,
                        damage: damage,
                        ability: null,
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
                });

                let head_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_phantom_assassin/phantom_assassin_shard_fan_of_knives.vpcf",
                     ParticleAttachment.ABSORIGIN_FOLLOW, attacker)
                ParticleManager.SetParticleControl(head_particle, 0, attacker.GetAbsOrigin())     
                // ParticleManager.SetParticleControlEnt(head_particle, 0, attacker, ParticleAttachment.POINT_FOLLOW, "attach_attack1", attacker.GetAbsOrigin(), true)
                ParticleManager.ReleaseParticleIndex(head_particle)

                attacker.EmitSound("Hero_PhantomAssassin.FanOfKnives.Cast")
            }

        }
    }
}


