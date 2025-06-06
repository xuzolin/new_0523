import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class suiliebingbao_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_suiliebingbao_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_suiliebingbao_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "crystal_maiden_freezing_field";
        // return "attr_damage";
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
            const enemies = FindUnitsInRadius(
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
            if (enemies.length > 0) {
                enemies[0].AddNewModifier(parent, this.GetAbility(), modifier_suiliebingbao_debuff.name, {
                    duration: duration,
                    radius: radius,
                    aoe_radius: aoe_radius,
                    damage_int_mult: this.damage_int_mult,
                    damage_frost_mult: this.damage_frost_mult,
                    frost_stack: this.frost_stack,
                })
                EmitSoundOnLocationWithCaster(parent.GetOrigin(), "hero_Crystal.freezingField.wind", parent)
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

// 技能效果
@registerModifier()
export class modifier_suiliebingbao_debuff extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }

    IsDebuff(): boolean {
        return true
    }

    IsPurgable(): boolean {
        return false;
    }
    private caster: CDOTA_BaseNPC_Hero
    private damage: number;
    private damage_int_mult: number;
    private damage_frost_mult: number;
    private frost_stack: number;

    private radius: number;
    private aoe_radius: number;
    private tickRate: number;
    private damageTable: ApplyDamageOptions;
    OnCreated(params: any): void {
        if (!IsServer()) return;
        this.caster = this.GetCaster() as CDOTA_BaseNPC_Hero;
        this.damage_int_mult = params.damage_int_mult ?? 0
        this.damage_frost_mult = params.damage_frost_mult ?? 0
        this.damage = this.damage_int_mult * this.caster.GetIntellect(false)
        this.radius = params.radius
        this.aoe_radius = params.aoe_radius
        this.frost_stack = params.frost_stack ?? 0

        this.tickRate = 0.1;

        this.damageTable = {
            victim: this.GetParent(),
            attacker: this.GetCaster(),
            damage: this.damage,
            ability: this.GetAbility(),
            damage_type: DamageTypes.MAGICAL,
            damage_flags: DamageFlag.NONE,
        };

        const particleId = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_crystalmaiden/maiden_freezing_field_snow.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent()
        );
        // ParticleManager.SetParticleControl(particleId, 0, this.GetParent().GetAbsOrigin());
        ParticleManager.SetParticleControlEnt(particleId, 0, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        ParticleManager.SetParticleControl(particleId, 1, Vector(this.radius, this.radius, this.radius));
        this.AddParticle(particleId, false, false, -1, false, false)


        const particleId2 = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_ancient_apparition/ancient_apparition_cold_feet.vpcf",
            ParticleAttachment.OVERHEAD_FOLLOW,
            this.GetParent()
        );
        ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
        this.AddParticle(particleId2, false, false, -1, false, false)


        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        // 获取区域内所有敌人
        let random_pos = this.GetParent().GetAbsOrigin() + RandomVector(RandomFloat(0, this.radius)) as Vector
        let enemies = FindUnitsInRadius(
            this.GetCaster().GetTeamNumber(), // 敌人的队伍
            random_pos, // 敌人的位置
            undefined, // 查找范围
            this.aoe_radius, // 查找范围
            UnitTargetTeam.ENEMY, // 查找敌人
            UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
            UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
            FindOrder.CLOSEST, // 查找顺序
            false
        )
        // 对每个敌人造成伤害
        enemies.forEach(enemy => {
            //计算伤害
            let damage = this.damage + enemy.GetModifierStackCount("modifier_frost_effect_debuff", this.GetCaster()) * this.damage_frost_mult
            ApplyDamage({
                victim: enemy,
                attacker: this.GetCaster(),
                damage: damage,
                ability: this.GetAbility(),
                damage_type: DamageTypes.MAGICAL,
                damage_flags: DamageFlag.NONE,
            });
            // 冰霜效果
            let modifier = enemy.FindModifierByName("modifier_frost_effect_debuff");
            if (modifier) {
                modifier.SetStackCount(modifier.GetStackCount() + this.frost_stack);
            } else {
                enemy.AddNewModifier(this.GetCaster(), null, "modifier_frost_effect_debuff", {});
            }

        });

        let fxIndex = ParticleManager.CreateParticle("particles/units/heroes/hero_crystalmaiden/maiden_freezing_field_explosion.vpcf",
            ParticleAttachment.CUSTOMORIGIN, this.GetParent())
        ParticleManager.SetParticleControl(fxIndex, 0, random_pos)
        ParticleManager.SetParticleControl(fxIndex, 1, random_pos)
        ParticleManager.ReleaseParticleIndex(fxIndex)
        EmitSoundOnLocationWithCaster(random_pos, "hero_Crystal.freezingField.explosion", this.GetParent())
    }

}
