import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class wudizhan_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_wudizhan_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_wudizhan_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "juggernaut_omni_slash";
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
                parent.AddNewModifier(this.GetCaster(), null, "modifier_wudizhan", {
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
}

// 技能效果
@registerModifier()
export class modifier_wudizhan extends BaseModifier {
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
        return "juggernaut_omni_slash";
    }
    private caster: CDOTA_BaseNPC_Hero
    private damage: number;
    private damage_int_mult: number;
    private damage_frost_mult: number;
    private frost_stack: number;

    private radius: number;
    private aoe_radius: number;
    private tickRate: number;
    private target: CDOTA_BaseNPC;

    OnCreated(params: any): void {
        if (!IsServer()) return;
        this.caster = this.GetCaster() as CDOTA_BaseNPC_Hero;
        this.damage_int_mult = params.damage_int_mult ?? 0
        this.damage_frost_mult = params.damage_frost_mult ?? 0
        // this.damage = this.damage_int_mult * this.caster.GetIntellect(false)
        this.damage = 100
        this.radius = params.radius
        this.aoe_radius = params.aoe_radius
        this.frost_stack = params.frost_stack ?? 0

        this.target = params.target

        this.tickRate = 1 / this.GetParent().GetAttacksPerSecond(false) * 0.5;

        // const particleId2 = ParticleManager.CreateParticle(
        //     "particles/units/heroes/hero_lich/lich_ice_age.vpcf",
        //     ParticleAttachment.ABSORIGIN_FOLLOW,
        //     this.GetParent()
        // );
        // ParticleManager.SetParticleControlEnt(particleId2, 1, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // // ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
        // // ParticleManager.SetParticleControl(particleId2, 1, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControl(particleId2, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
        // this.AddParticle(particleId2, false, false, -1, false, false)

        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        if (this.target == null) {
            //释放技能
            const targets = FindUnitsInRadius(
                this.GetParent().GetTeamNumber(), // 敌人的队伍
                this.GetParent().GetAbsOrigin(), // 敌人的位置
                undefined, // 查找范围
                600, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.ANY, // 查找顺序
                false
            );
            this.target = targets[0]
        }
        if (this.target == null) {
            this.Destroy()
            return;
        }
        let previous_position = this.GetParent().GetAbsOrigin()

        FindClearSpaceForUnit(this.GetParent(), this.target.GetAbsOrigin(), false)

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
            // // 冰霜效果
            // let modifier = enemy.FindModifierByName("modifier_frost_effect_debuff");
            // if (modifier) {
            //     modifier.SetStackCount(modifier.GetStackCount() + this.frost_stack);
            // } else {
            //     enemy.AddNewModifier(this.GetCaster(), null, "modifier_frost_effect_debuff", {});
            // }

            let hit_pfx = ParticleManager.CreateParticle("particles/units/heroes/hero_juggernaut/juggernaut_omni_slash_tgt.vpcf", ParticleAttachment.ABSORIGIN_FOLLOW, enemy)
            ParticleManager.SetParticleControl(hit_pfx, 0, enemy.GetOrigin())
            ParticleManager.SetParticleControl(hit_pfx, 1, enemy.GetOrigin())
            ParticleManager.ReleaseParticleIndex(hit_pfx)

        });

        let trail_pfx = ParticleManager.CreateParticle("particles/units/heroes/hero_juggernaut/juggernaut_omni_slash_trail.vpcf", ParticleAttachment.ABSORIGIN, this.GetParent())
        ParticleManager.SetParticleControl(trail_pfx, 0, previous_position)
        ParticleManager.SetParticleControl(trail_pfx, 1, this.target.GetOrigin())
        ParticleManager.ReleaseParticleIndex(trail_pfx)
        this.GetParent().EmitSound("Hero_Juggernaut.OmniSlash")


        this.target = null
        this.GetParent().Stop()

        // const particleId = ParticleManager.CreateParticle(
        //     "particles/units/heroes/hero_lich/lich_ice_age_dmg.vpcf",
        //     ParticleAttachment.ABSORIGIN_FOLLOW,
        //     this.GetParent()
        // );
        // ParticleManager.SetParticleControl(particleId, 0, this.GetParent().GetAbsOrigin());
        // // ParticleManager.SetParticleControl(particleId, 1, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControlEnt(particleId, 1, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // ParticleManager.SetParticleControl(particleId, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
        // ParticleManager.ReleaseParticleIndex(particleId);
        // EmitSoundOnLocationWithCaster(this.GetParent().GetAbsOrigin(), "Hero_Lich.IceAge.Tick", this.GetParent())
    }

    CheckState() {
        return {
            [ModifierState.UNSELECTABLE]: true,
            [ModifierState.COMMAND_RESTRICTED]: true,
            [ModifierState.NO_UNIT_COLLISION]: true,
            [ModifierState.INVULNERABLE]: true,
            [ModifierState.NO_HEALTH_BAR]: true,
            [ModifierState.MAGIC_IMMUNE]: true,
        };
    }
}
