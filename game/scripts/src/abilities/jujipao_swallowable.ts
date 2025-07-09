import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class jujipao_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_jujipao_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_jujipao_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "hoodwink_sharpshooter";
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


                let effectName = "particles/units/heroes/hero_hoodwink/hoodwink_sharpshooter_projectile.vpcf";
                let projectile_speed = 3000;
                let distance = 2000;
                let direction = attacker.GetForwardVector();
                let velocity = direction * projectile_speed as Vector;
                let vSpawnOrigin = attacker.GetAbsOrigin();
                let Ability = attacker.FindAbilityByName("custom_OnProjectileHit")
                ProjectileManager.CreateLinearProjectile({
                    Ability: Ability,
                    EffectName: effectName,
                    vSpawnOrigin: vSpawnOrigin,
                    fDistance: distance,
                    // fMaxSpeed:1000,
                    // iVisionRadius: 300,
                    fStartRadius: 300,
                    fEndRadius: 300,
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

                EmitSoundOn("Hero_Snapfire.Shotgun.Fire", attacker)
            }

        }
    }

    // If 'true` is returned, projectile would be destroyed.
    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
        // print("OnProjectileHit", modifier_name)
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


