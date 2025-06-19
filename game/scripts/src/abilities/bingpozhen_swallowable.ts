import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class bingpozhen_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_bingpozhen_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_bingpozhen_swallowable extends BaseModifier {
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
            parent.AddNewModifier(parent, null, "modifier_bingpozhen", {
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
export class modifier_bingpozhen extends BaseModifier {
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


        this.StartIntervalThink(this.tickRate);
        // this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent()
        // 获取区域内所有敌人
        let point = this.startPosition + this.direction * this.distance * this.count as Vector
        let enemies = FindUnitsInRadius(
            this.caster.GetTeamNumber(),
            point,
            undefined,
            this.aoe_radius,
            UnitTargetTeam.ENEMY,
            UnitTargetType.HERO + UnitTargetType.BASIC,
            UnitTargetFlags.NONE,
            FindOrder.ANY,
            false
        );

        //对区域内所有敌人造成伤害
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

        let nova_pfx = ParticleManager.CreateParticle("particles/units/heroes/hero_crystalmaiden/maiden_crystal_nova.vpcf",
            ParticleAttachment.CUSTOMORIGIN, this.GetParent())
        ParticleManager.SetParticleControl(nova_pfx, 0, point)
        ParticleManager.SetParticleControl(nova_pfx, 1, Vector(this.aoe_radius, this.tickRate, this.aoe_radius))
        ParticleManager.SetParticleControl(nova_pfx, 2, point)
        ParticleManager.ReleaseParticleIndex(nova_pfx)
        EmitSoundOnLocationWithCaster(point, "Hero_Crystal.CrystalNova", this.GetParent())

        this.count += 1;
        if (this.count >= this.max_count) {
            this.Destroy();
        }
    }

}