import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class shenzhililiang_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_shenzhililiang_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_shenzhililiang_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "sven_gods_strength";
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
            parent.AddNewModifier(parent, null, "modifier_shenzhililiang", {
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
export class modifier_shenzhililiang extends BaseModifier {
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
        return "sven_gods_strength";
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

    strength: number;
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

        this.strength = this.caster.GetStrength()

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

        let transform_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_sven/sven_spell_gods_strength.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent())
        ParticleManager.ReleaseParticleIndex(transform_particle)

        this.GetParent().EmitSound("Hero_Sven.GodsStrength")
    }

    OnDestroy(): void {
        if (!IsServer()) return;
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent()

    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.DAMAGEOUTGOING_PERCENTAGE,
            ModifierFunction.STATS_STRENGTH_BONUS,

            ModifierFunction.ON_ATTACK,

            ModifierFunction.TRANSLATE_ATTACK_SOUND,
        ]
    }


    GetModifierDamageOutgoing_Percentage(): number {
        return 100
    }

    GetModifierBonusStats_Strength(): number {
        return this.strength
    }

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            let target = event.target as CDOTA_BaseNPC;

            let direction = attacker.GetForwardVector();
            let origin = attacker.GetAbsOrigin()
            let tTargets = FindUnitsInRadius(
                attacker.GetTeamNumber(),
                attacker.GetAbsOrigin(),
                null,
                600,
                UnitTargetTeam.ENEMY,
                UnitTargetType.ALL,
                UnitTargetFlags.NONE,
                FindOrder.CLOSEST,
                false,
            );

            tTargets = tTargets.filter(unit => {
                //获取前方一定角度的范围内的敌人
                let facing_direction = attacker.GetAnglesAsVector().y;
                let unit_vector = ((unit.GetOrigin() - attacker.GetOrigin()) as Vector).Normalized();
                let unit_direction = VectorToAngles(unit_vector).y;
                let angle_diff = AngleDiff(facing_direction, unit_direction);
                angle_diff = math.abs(angle_diff);
                //前方左右各30度
                if (angle_diff < 45) return unit;
            });

            for (const target of tTargets) {
                let damage = 100
                ApplyDamage({
                    victim: target,
                    attacker: attacker,
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.MAGICAL,
                    damage_flags: DamageFlag.NONE,
                });
            }

            // // -- Prepare for the second attack
            // let particle = ParticleManager.CreateParticle("particles/econ/items/sven/sven_ti7_sword/sven_ti7_sword_spell_great_cleave_gods_strength_crit.vpcf",
            //     ParticleAttachment.CUSTOMORIGIN, null)
            // ParticleManager.SetParticleControlEnt(particle, 0, attacker, ParticleAttachment.POINT_FOLLOW, "attach_hitloc", target.GetAbsOrigin(), true)
            // ParticleManager.SetParticleControl(particle, 1, target.GetAbsOrigin())
            // ParticleManager.SetParticleControl(particle, 2, Vector(500, 0, 0))
            // // ParticleManager.SetParticleControlEnt(particle, 2, attacker, ParticleAttachment.CUSTOMORIGIN, "attach_hitloc", target.GetAbsOrigin(), true)
            // ParticleManager.ReleaseParticleIndex(particle)


            EmitSoundOn("Hero_DeathProphet.CarrionSwarm", attacker)

            let cleave_particle = "particles/econ/items/sven/sven_ti7_sword/sven_ti7_sword_spell_great_cleave_gods_strength_crit.vpcf"
            // let cleave_particle = "particles/units/heroes/hero_sven/sven_spell_great_cleave.vpcf"
			DoCleaveAttack(
                attacker,
                target,
                null,
                0,
                100,
                500,
                600,
                cleave_particle 
            )


        }
    }

    GetAttackSound() {
        return "Hero_Sven.GodsStrength.Attack"
    }

    GetStatusEffectName() {
        return "particles/status_fx/status_effect_gods_strength.vpcf"
    }

    StatusEffectPriority() {
        return 99
    }

    GetHeroEffectName() {
        return "particles/units/heroes/hero_sven/sven_gods_strength_hero_effect.vpcf"
    }

    HeroEffectPriority() {
        return 99
    }
}