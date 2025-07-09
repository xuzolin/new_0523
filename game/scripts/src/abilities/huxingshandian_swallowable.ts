import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class huxingshandian_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_huxingshandian_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_huxingshandian_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "zuus_arc_lightning";
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

    private attack_count: number = GetAbilityValues(this.ability_name, "attack_count");

    count: number = 0;
    // private original_cd: number = 10;
    // private original_duration = 5;
    // private original_radius = 810;
    // private original_aoe_radius = 320;

    override OnCreated(params: object): void {
        if (!IsServer()) return;
    }

    DeclareFunctions() {
        return [
            // ModifierFunction.ON_ATTACK_LANDED,
            ModifierFunction.ON_ATTACK,
        ];
    }

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            let target = event.target as CDOTA_BaseNPC;
            this.count++
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (this.count >= this.attack_count) {

                //冷却缩减
                let cd_red = attacker.GetCooldownReduction()
                let cd = this.original_cd * cd_red
                let duration = this.original_duration
                let radius = this.original_radius
                let aoe_radius = this.original_aoe_radius

                attacker.AddNewModifier(attacker, null, "modifier_huxingshandian", {
                    duration: duration,
                    radius: radius,
                    aoe_radius: aoe_radius,
                    damage_int_mult: this.damage_int_mult,
                    damage_frost_mult: this.damage_frost_mult,
                    frost_stack: this.frost_stack,
                    target_ent: target.GetEntityIndex(),
                });

                let head_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_zuus/zuus_arc_lightning_head.vpcf", ParticleAttachment.ABSORIGIN_FOLLOW, attacker)
                ParticleManager.SetParticleControlEnt(head_particle, 0, attacker, ParticleAttachment.POINT_FOLLOW, "attach_attack1", attacker.GetAbsOrigin(), true)
                ParticleManager.SetParticleControlEnt(head_particle, 1, target, ParticleAttachment.POINT_FOLLOW, "attach_hitloc", target.GetAbsOrigin(), true)
                ParticleManager.ReleaseParticleIndex(head_particle)

                attacker.EmitSound("Hero_Zuus.ArcLightning.Cast")

                this.count = 0;
            }
        }
    }
}

// 技能效果
@registerModifier()
export class modifier_huxingshandian extends BaseModifier {
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
        return "zuus_arc_lightning";
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

    count: number = 0;
    max_count: number

    target: CDOTA_BaseNPC
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

        this.max_count = 6

        this.SetDuration(this.max_count * this.tickRate + 1, false)

        this.target = EntIndexToHScript(params.target_ent) as CDOTA_BaseNPC

        this.StartIntervalThink(this.tickRate);
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent();
        this.count++
        if (this.count > this.max_count) {
            this.Destroy()
            return
        }

        let damage = 100
        ApplyDamage({
            victim: this.target,
            attacker: parent,
            damage: damage,
            ability: null,
            damage_type: DamageTypes.MAGICAL,
            damage_flags: DamageFlag.NONE,
        });

        this.target.EmitSound("Hero_Zuus.ArcLightning.Target")

        let enemies = FindUnitsInRadius(
            parent.GetTeamNumber(),
            this.target.GetAbsOrigin(),
            undefined,
            600,
            UnitTargetTeam.ENEMY,
            UnitTargetType.HERO + UnitTargetType.BASIC,
            UnitTargetFlags.NONE,
            FindOrder.ANY,
            false
        );
        enemies = enemies.filter(enemy => {
            return enemy != this.target
        })

        if (enemies.length > 0) {
            let new_target = enemies[0]
            let lightning_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_zuus/zuus_arc_lightning_.vpcf",
                ParticleAttachment.ABSORIGIN_FOLLOW, this.target)
            ParticleManager.SetParticleControlEnt(lightning_particle, 0, this.target, ParticleAttachment.POINT_FOLLOW, "attach_hitloc", this.target.GetAbsOrigin(), true)
            ParticleManager.SetParticleControlEnt(lightning_particle, 1, new_target, ParticleAttachment.POINT_FOLLOW, "attach_hitloc", new_target.GetAbsOrigin(), true)
            ParticleManager.SetParticleControl(lightning_particle, 62, Vector(2, 0, 2))
            ParticleManager.ReleaseParticleIndex(lightning_particle)

            this.target = new_target

        } else {
            this.Destroy()
            return
        }
    }


}


