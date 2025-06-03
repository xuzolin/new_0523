import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class bingshuangmodun_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_bingshuangmodun_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_bingshuangmodun_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "lich_frost_shield";
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

        // print("OnCreated", this.damage_int_mult)
        // print("OnCreated", this.damage_frost_mult)
        // print("OnCreated", this.frost_stack)
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
            parent.AddNewModifier(this.GetCaster(), null, "modifier_bingshuangmodun", {
                duration: duration,
                radius: radius,
                aoe_radius: aoe_radius,
                damage_int_mult: this.damage_int_mult,
                damage_frost_mult: this.damage_frost_mult,
                frost_stack: this.frost_stack,
            });

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
export class modifier_bingshuangmodun extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }

    IsDebuff(): boolean {
        return false
    }

    IsPurgable(): boolean {
        return false;
    }

    GetTexture() {
        return "lich_frost_shield";
    }
    private caster: CDOTA_BaseNPC_Hero
    private damage: number;
    private damage_int_mult: number;
    private damage_frost_mult: number;
    private frost_stack: number;

    private radius: number;
    private aoe_radius: number;
    private tickRate: number;
    OnCreated(params: any): void {
        if (!IsServer()) return;
        this.caster = this.GetCaster() as CDOTA_BaseNPC_Hero;
        this.damage_int_mult = params.damage_int_mult ?? 0
        this.damage_frost_mult = params.damage_frost_mult ?? 0
        this.damage = this.damage_int_mult * this.caster.GetIntellect(false)
        this.radius = params.radius
        this.aoe_radius = params.aoe_radius
        this.frost_stack = params.frost_stack ?? 0

        this.tickRate = 1;

        const particleId2 = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_lich/lich_ice_age.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent()
        );
        ParticleManager.SetParticleControlEnt(particleId2, 1, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControl(particleId2, 1, this.GetParent().GetAbsOrigin());
        ParticleManager.SetParticleControl(particleId2, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
        this.AddParticle(particleId2, false, false, -1, false, false)


        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        // 获取区域内所有敌人
        // let random_pos = this.GetParent().GetAbsOrigin() + RandomVector(RandomFloat(0, this.radius)) as Vector
        let enemies = FindUnitsInRadius(
            this.GetCaster().GetTeamNumber(), // 敌人的队伍
            this.GetParent().GetAbsOrigin(), // 敌人的位置
            undefined,
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
        const particleId = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_lich/lich_ice_age_dmg.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent()
        );
        ParticleManager.SetParticleControl(particleId, 0, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControl(particleId, 1, this.GetParent().GetAbsOrigin());
        ParticleManager.SetParticleControlEnt(particleId, 1, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        ParticleManager.SetParticleControl(particleId, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
        ParticleManager.ReleaseParticleIndex(particleId);
        EmitSoundOnLocationWithCaster(this.GetParent().GetAbsOrigin(), "Hero_Lich.IceAge.Tick", this.GetParent())
    }

}
