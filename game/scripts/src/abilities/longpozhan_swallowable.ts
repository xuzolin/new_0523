import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class longpozhan_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_longpozhan_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_longpozhan_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "lina_dragon_slave";
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
        // this.StartIntervalThink(this.interval)

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

            if (targets.length > 0) {
                parent.AddNewModifier(parent, null, "modifier_longpozhan", {
                    duration: duration,
                    radius: radius,
                    aoe_radius: aoe_radius,
                    damage_int_mult: this.damage_int_mult,
                    damage_frost_mult: this.damage_frost_mult,
                    frost_stack: this.frost_stack,
                    target: targets[0],

                });
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

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(50, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                //投射物
                let projectile_speed = 1000;
                let distance = 800;
                let effectName = "particles/units/heroes/hero_lina/lina_spell_dragon_slave.vpcf";
                let direction = attacker.GetForwardVector();
                let velocity = direction * projectile_speed as Vector;
                let Ability = attacker.FindAbilityByName("custom_OnProjectileHit")
                // print("Ability", Ability.GetAbilityName())
                ProjectileManager.CreateLinearProjectile({
                    Ability: Ability,
                    EffectName: effectName,
                    vSpawnOrigin: attacker.GetAbsOrigin(),
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
                // EmitSoundOn("Hero_DeathProphet.CarrionSwarm", attacker)
                attacker.EmitSound("Hero_Lina.DragonSlave")
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