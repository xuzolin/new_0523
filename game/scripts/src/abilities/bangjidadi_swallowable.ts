import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class bangjidadi_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_bangjidadi_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_bangjidadi_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "monkey_king_boundless_strike";
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
                parent.AddNewModifier(this.GetCaster(), null, "modifier_bangjidadi", {
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
                let distance = 1200;
                let direction = attacker.GetForwardVector();
                let start_point = attacker.GetAbsOrigin()
                let ent_point = start_point + direction * distance as Vector

                let units = FindUnitsInLine(
                    attacker.GetTeamNumber(),
                    start_point,
                    ent_point,
                    undefined,
                    100,
                    UnitTargetTeam.ENEMY,
                    UnitTargetType.HERO + UnitTargetType.BASIC,
                    UnitTargetFlags.NONE,
                )
                for (let unit of units) {
                    let damage = 100
                    ApplyDamage({
                        victim: unit,
                        attacker: this.GetCaster(),
                        damage: damage,
                        ability: this.GetAbility(),
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
                }
                // let strike_cast = ParticleManager.CreateParticle(
                //     "particles/units/heroes/hero_monkey_king/monkey_king_strike_cast.vpcf",
                //     ParticleAttachment.POINT_FOLLOW, this.GetParent()
                // )
                // // ParticleManager.SetParticleControl(strike_cast, 0, start_point)
                // // ParticleManager.SetParticleControl(strike_cast, 1, ent_point)
                // ParticleManager.ReleaseParticleIndex(strike_cast)

                let nova_pfx = ParticleManager.CreateParticle(
                    "particles/units/heroes/hero_monkey_king/monkey_king_strike.vpcf",
                    ParticleAttachment.POINT_FOLLOW, this.GetParent()
                )
                ParticleManager.SetParticleControl(nova_pfx, 0, start_point)
                // ParticleManager.SetParticleControlEnt(nova_pfx, 0, this.GetParent(), ParticleAttachment.ABSORIGIN, undefined, start_point, true);
                ParticleManager.SetParticleControl(nova_pfx, 1, ent_point)
                ParticleManager.SetParticleControl(nova_pfx, 2, ent_point)
                ParticleManager.ReleaseParticleIndex(nova_pfx)

                EmitSoundOn("Hero_DeathProphet.CarrionSwarm", attacker)

            }

        }
    }
}