import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class yanren_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_yanren_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_yanren_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "doom_bringer_infernal_blade";
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
                parent.AddNewModifier(this.GetCaster(), null, "modifier_yanren", {
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
            let target = event.target as CDOTA_BaseNPC;

            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(50, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                let radius = 500;
                let enemies = FindUnitsInRadius(
                    attacker.GetTeamNumber(), // 敌人的队伍
                    target.GetAbsOrigin(), // 敌人的位置
                    undefined,
                    radius, // 查找范围
                    UnitTargetTeam.ENEMY, // 查找敌人
                    UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                    UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                    FindOrder.CLOSEST, // 查找顺序
                    false
                )
                // 对每个敌人造成伤害
                enemies.forEach(enemy => {
                    //计算伤害
                    let damage = 100
                    ApplyDamage({
                        victim: enemy,
                        attacker: this.GetCaster(),
                        damage: damage,
                        ability: this.GetAbility(),
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
         
                });

                let ParticleID = ParticleManager.CreateParticle(
                    "particles/units/heroes/hero_doom_bringer/doom_bringer_lvl_death.vpcf",
                    ParticleAttachment.POINT_FOLLOW, target
                )
                // ParticleManager.SetParticleControl(ParticleID, 0, start_point)
                // // ParticleManager.SetParticleControlEnt(nova_pfx, 0, this.GetParent(), ParticleAttachment.ABSORIGIN, undefined, start_point, true);
                // ParticleManager.SetParticleControl(ParticleID, 1, ent_point)
                // ParticleManager.SetParticleControl(ParticleID, 2, ent_point)
                ParticleManager.ReleaseParticleIndex(ParticleID)

                EmitSoundOn("Hero_DeathProphet.CarrionSwarm", attacker)
            }

        }
    }
}