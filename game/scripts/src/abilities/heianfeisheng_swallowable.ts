import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class heianfeisheng_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_heianfeisheng_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_heianfeisheng_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "night_stalker_darkness";
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
            parent.AddNewModifier(parent, null, "modifier_heianfeisheng", {
                duration: duration,
                radius: radius,
                aoe_radius: aoe_radius,
                damage_int_mult: this.damage_int_mult,
                damage_frost_mult: this.damage_frost_mult,
                frost_stack: this.frost_stack,
            });

            // EmitSoundOn("Hero_SkywrathMage.MysticFlare.Cast", parent)
            // EmitSoundOnLocationWithCaster(parent.GetAbsOrigin(), "Hero_SkywrathMage.MysticFlare", parent)
            // EmitSoundOnLocationWithCaster(parent.GetOrigin(), "hero_Crystal.freezingField.wind", parent)
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
export class modifier_heianfeisheng extends BaseModifier {
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
        return "night_stalker_darkness";
    }
    private caster: CDOTA_BaseNPC_Hero
    private damage: number;
    private damage_int_mult: number;
    private damage_frost_mult: number;
    private frost_stack: number;

    private radius: number;
    private aoe_radius: number;
    private tickRate: number;
    private count: number;
    private max_count: number = 5;
    private distance: number;
    private direction: Vector;
    private startPosition: Vector;

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
        this.count = 0;

        this.startPosition = this.GetParent().GetAbsOrigin();
        this.direction = this.caster.GetForwardVector()
        this.distance = 300

        // const particleId2 = ParticleManager.CreateParticle(
        //     // "particles/units/heroes/hero_zeus/zeus_cloud.vpcf",
        //     "particles/units/heroes/hero_zeus/zeus_cloud_ground_haze.vpcf",
        //     ParticleAttachment.ABSORIGIN_FOLLOW,
        //     this.GetParent()
        // );
        // ParticleManager.SetParticleControlEnt(particleId2, 0, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // // ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
        // // ParticleManager.SetParticleControl(particleId2, 1, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControl(particleId2, 1, Vector(this.radius, 0, 0));
        // this.AddParticle(particleId2, false, false, -1, false, false)


        // this.StartIntervalThink(this.tickRate);
        // this.OnIntervalThink();

        let transform_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_night_stalker/nightstalker_ulti.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent())
        ParticleManager.ReleaseParticleIndex(transform_particle)

        let particle_ally_fx = ParticleManager.CreateParticle("particles/units/heroes/hero_night_stalker/nightstalker_crippling_fear_aura.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent())
        ParticleManager.SetParticleControl(particle_ally_fx, 1, this.GetParent().GetAbsOrigin())
        ParticleManager.SetParticleControl(particle_ally_fx, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius))
        ParticleManager.SetParticleControl(particle_ally_fx, 3, this.GetParent().GetAbsOrigin())
        this.AddParticle(particle_ally_fx, false, false, -1, false, false)

        this.GetParent().EmitSound("Hero_Nightstalker.Darkness")
    }

    OnDestroy(): void {
        if (!IsServer()) return;
    }

    OnIntervalThink() {
        if (!IsServer()) return;
    }

    DeclareFunctions(): ModifierFunction[] {
        return [

            ModifierFunction.DAMAGEOUTGOING_PERCENTAGE,
            ModifierFunction.MOVESPEED_BONUS_CONSTANT,

        ]
    }

    GetModifierDamageOutgoing_Percentage(): number {
        return 100
    }

    GetModifierMoveSpeedBonus_Constant(): number {
        return 100
    }

    // 光环
    IsAura() { return true; }
    GetModifierAura() { return "modifier_heianfeisheng_aura_debuff"; }
    GetAuraRadius() {
        return this.aoe_radius;//触发动画范围
    }
    GetAuraSearchFlags() {
        return UnitTargetFlags.MAGIC_IMMUNE_ENEMIES;
    }
    GetAuraSearchTeam() {
        return UnitTargetTeam.ENEMY;
    }
    GetAuraSearchType() {
        return UnitTargetType.ALL;
    }
    GetAuraEntityReject(entity: CDOTA_BaseNPC) {
        //光环过滤掉的单位
        //不是英雄的过滤掉
        // return !(entity.IsRealHero());
        return false;
    }

}

@registerModifier()
export class modifier_heianfeisheng_aura_debuff extends BaseModifier {
    IsHidden(): boolean {
        return true;
    }
    IsDebuff(): boolean {
        return true
    }

    GetTexture() {
        return "night_stalker_darkness";
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.MISS_PERCENTAGE,
        ]
    }

    GetModifierMiss_Percentage(){
        return 50
    }

}