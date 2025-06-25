import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class shengguangzhen_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_shengguangzhen_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_shengguangzhen_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "skywrath_mage_mystic_flare";
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
            parent.AddNewModifier(parent, null, "modifier_shengguangzhen", {
                duration: duration,
                radius: radius,
                aoe_radius: aoe_radius,
                damage_int_mult: this.damage_int_mult,
                damage_frost_mult: this.damage_frost_mult,
                frost_stack: this.frost_stack,
            });

            // EmitSoundOn("Hero_SkywrathMage.MysticFlare.Cast", parent)
            // EmitSoundOnLocationWithCaster(parent.GetAbsOrigin(), "Hero_SkywrathMage.MysticFlare", parent)
            EmitSoundOnLocationWithCaster(parent.GetOrigin(), "hero_Crystal.freezingField.wind", parent)
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
export class modifier_shengguangzhen extends BaseModifier {
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
        return "skywrath_mage_mystic_flare";
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

        this.tickRate = 0.5;

        //白圈
        const particleId2 = ParticleManager.CreateParticle(
            // "particles/units/heroes/hero_zeus/zeus_cloud.vpcf",
            "particles/units/heroes/hero_zeus/zeus_cloud_ground_haze.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent()
        );
        ParticleManager.SetParticleControlEnt(particleId2, 0, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControl(particleId2, 1, this.GetParent().GetAbsOrigin());
        ParticleManager.SetParticleControl(particleId2, 1, Vector(this.radius, 0, 0));
        this.AddParticle(particleId2, false, false, -1, false, false)


        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent()
        // 获取区域内所有敌人
        let random_pos1 = parent.GetAbsOrigin() + RandomVector(RandomFloat(0, this.radius)) as Vector
        let random_pos2 = parent.GetAbsOrigin() + RandomVector(RandomFloat(0, this.radius)) as Vector
        let thinker1 = CreateModifierThinker(parent, null, "modifier_shengguangzhen_thinker", {
            duration: 3,
            radius: this.radius,
            aoe_radius: this.aoe_radius,
            damage_int_mult: this.damage_int_mult,
            damage_frost_mult: this.damage_frost_mult,
            frost_stack: this.frost_stack,
        },
            random_pos1,
            parent.GetTeamNumber(),
            false,
        );
        let thinker2 = CreateModifierThinker(parent, null, "modifier_shengguangzhen_thinker", {
            duration: 3,
            radius: this.radius,
            aoe_radius: this.aoe_radius,
            damage_int_mult: this.damage_int_mult,
            damage_frost_mult: this.damage_frost_mult,
            frost_stack: this.frost_stack,
        },
            random_pos2,
            parent.GetTeamNumber(),
            false,
        );
    }

}

// 技能效果
@registerModifier()
export class modifier_shengguangzhen_thinker extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }

    IsDebuff(): boolean {
        return false
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
    private particleId: ParticleID;
    OnCreated(params: any): void {
        if (!IsServer()) return;
        this.caster = this.GetCaster() as CDOTA_BaseNPC_Hero;
        this.damage_int_mult = params.damage_int_mult ?? 0
        this.damage_frost_mult = params.damage_frost_mult ?? 0
        this.damage = this.damage_int_mult * this.caster.GetIntellect(false)
        this.radius = params.radius
        this.aoe_radius = params.aoe_radius
        this.frost_stack = params.frost_stack ?? 0

        this.tickRate = 0.2;

        this.damageTable = {
            victim: this.GetParent(),
            attacker: this.GetCaster(),
            damage: this.damage,
            ability: this.GetAbility(),
            damage_type: DamageTypes.MAGICAL,
            damage_flags: DamageFlag.NONE,
        };

        this.particleId = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_skywrath_mage/skywrath_mage_mystic_flare_ambient.vpcf",
            ParticleAttachment.WORLDORIGIN,
            this.GetParent()
        );
        ParticleManager.SetParticleControl(this.particleId, 0, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControlEnt(particleId, 0, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        ParticleManager.SetParticleControl(this.particleId, 1, Vector(this.aoe_radius, this.GetDuration(), this.tickRate));
        ParticleManager.ReleaseParticleIndex(this.particleId)
        // this.AddParticle(particleId, false, false, -1, false, false)

        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    // OnDestroy() {
    //     if (!IsServer()) return;
    //     if (this.particleId) {
    //         ParticleManager.DestroyParticle(this.particleId, false)
    //     }
    // }

    OnIntervalThink() {
        if (!IsServer()) return;
        "particles/units/heroes/hero_skywrath_mage/skywrath_mage_mystic_flare.vpcf"
        // 获取区域内所有敌人
        let location = this.GetParent().GetAbsOrigin()
        let enemies = FindUnitsInRadius(
            this.GetCaster().GetTeamNumber(), // 敌人的队伍
            location, // 敌人的位置
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
            let damage = 100
            ApplyDamage({
                victim: enemy,
                attacker: this.GetCaster(),
                damage: damage,
                ability: this.GetAbility(),
                damage_type: DamageTypes.MAGICAL,
                damage_flags: DamageFlag.NONE,
            });
            // let direction = (enemy.GetAbsOrigin() - location as Vector).Normalized()
            // let distance = (enemy.GetAbsOrigin() - location as Vector).Length2D()
            // enemy.SetOrigin(enemy.GetAbsOrigin() - direction * distance * 0.5 as Vector)
            // print("OnIntervalThink", direction * distance)
        });
    }
}
