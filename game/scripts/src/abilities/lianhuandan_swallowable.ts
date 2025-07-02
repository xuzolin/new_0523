import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class lianhuandan_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_lianhuandan_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_lianhuandan_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "clinkz_burning_barrage";
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

    private attack_chance: number = GetAbilityValues(this.ability_name, "attack_chance");

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
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(this.attack_chance, PseudoRandom.CUSTOM_GENERIC, attacker)) {

                //冷却缩减
                let cd_red = attacker.GetCooldownReduction()
                let cd = this.original_cd * cd_red
                let duration = this.original_duration
                let radius = this.original_radius
                let aoe_radius = this.original_aoe_radius

                attacker.AddNewModifier(attacker, null, "modifier_lianhuandan", {
                    duration: duration,
                    radius: radius,
                    aoe_radius: aoe_radius,
                    damage_int_mult: this.damage_int_mult,
                    damage_frost_mult: this.damage_frost_mult,
                    frost_stack: this.frost_stack,
                });
            }




        }
    }
}

// 技能效果
@registerModifier()
export class modifier_lianhuandan extends BaseModifier {
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

    count: number = 0;
    max_count: number

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

        this.max_count = 30

        this.SetDuration(this.max_count * this.tickRate, false)

        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent();
        this.count++
        if (this.count > this.max_count) {
            this.Destroy()
            return
        }
        //投射物
        let projectile_speed = 2000;
        let distance = 1200;

        let effectName = "particles/units/heroes/hero_clinkz/clinkz_searing_arrow_linear_proj.vpcf";

        let direction = parent.GetForwardVector();
        let velocity = direction * projectile_speed as Vector;
        let Ability = parent.FindAbilityByName("custom_OnProjectileHit")

        ProjectileManager.CreateLinearProjectile({
            Ability: Ability,
            EffectName: effectName,
            vSpawnOrigin: parent.GetAbsOrigin(),
            fDistance: distance,
            // fMaxSpeed:1000,
            // iVisionRadius: 300,
            fStartRadius: 100,
            fEndRadius: 100,
            Source: parent,
            bHasFrontalCone: false,
            // bReplaceExisting:false,
            iUnitTargetTeam: UnitTargetTeam.ENEMY,
            iUnitTargetFlags: UnitTargetFlags.NONE,
            iUnitTargetType: UnitTargetType.ALL,
            fExpireTime: GameRules.GetGameTime() + 5,
            vVelocity: velocity,
            bProvidesVision: false,
            ExtraData: {
                name: this.GetName(),
                danage: 100,
                damage_type: DamageTypes.MAGICAL,
            },
        });
        // attacker.EmitSound("Hero_DrowRanger.Multishot.Attack")
        parent.EmitSound("Hero_Clinkz.SearingArrows")
    }

    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
        if (target) {
            ApplyDamage({
                victim: target,
                attacker: this.GetParent(),
                damage: 100,
                ability: this.GetAbility(),
                damage_type: DamageTypes.PHYSICAL,
                damage_flags: DamageFlag.NONE,
            });
        }
        return false
    }
}


