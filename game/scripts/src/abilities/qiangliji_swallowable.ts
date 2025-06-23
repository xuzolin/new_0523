import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class qiangliji_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_qiangliji_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_qiangliji_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "drow_ranger_multishot";
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

    private trigger_chance: number = GetAbilityValues(this.ability_name, "trigger_chance");

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
            if (RollPseudoRandomPercentage(this.trigger_chance, PseudoRandom.CUSTOM_GENERIC, attacker)) {

                const particleId2 = ParticleManager.CreateParticle(
                    "particles/econ/items/windrunner/windrunner_ti6/windrunner_spell_powershot_channel_ti6_shock_ring.vpcf",
                    ParticleAttachment.ABSORIGIN_FOLLOW,
                    this.GetParent()
                );
                ParticleManager.SetParticleControlEnt(particleId2, 1, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
                // ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
                // ParticleManager.SetParticleControl(particleId2, 1, this.GetParent().GetAbsOrigin());
                // ParticleManager.SetParticleControl(particleId2, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
                ParticleManager.ReleaseParticleIndex(particleId2)



                //投射物
                let projectile_speed = 2000;
                let distance = 1200;

                // let effectName = "particles/econ/items/windrunner/windranger_arcana/windranger_arcana_spell_powershot.vpcf";
                let effectName = "particles/econ/items/windrunner/windranger_arcana/windranger_arcana_spell_powershot_combo.vpcf";

                let direction = attacker.GetForwardVector();
                let velocity = direction * projectile_speed as Vector;
                let Ability = attacker.FindAbilityByName("custom_OnProjectileHit")

                ProjectileManager.CreateLinearProjectile({
                    Ability: Ability,
                    EffectName: effectName,
                    vSpawnOrigin: attacker.GetAbsOrigin(),
                    fDistance: distance,
                    // fMaxSpeed:1000,
                    // iVisionRadius: 300,
                    fStartRadius: 100,
                    fEndRadius: 100,
                    Source: attacker,
                    bHasFrontalCone: false,
                    // bReplaceExisting:false,
                    iUnitTargetTeam: UnitTargetTeam.ENEMY,
                    iUnitTargetFlags: UnitTargetFlags.NONE,
                    iUnitTargetType: UnitTargetType.ALL,
                    fExpireTime: GameRules.GetGameTime() + 5,
                    vVelocity: velocity,
                    bProvidesVision: false,
                    ExtraData: {
                        name: this.GetName(),
                        danage: 100,
                        damage_type: DamageTypes.MAGICAL,
                    },
                });
                // attacker.EmitSound("Hero_DrowRanger.Multishot.Attack")
                attacker.EmitSound("Ability.Powershot")
            }

        }
    }
}


