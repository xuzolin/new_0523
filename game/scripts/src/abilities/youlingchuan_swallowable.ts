import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class youlingchuan_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_youlingchuan_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_youlingchuan_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "kunkka_ghostship";
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

                attacker.AddNewModifier(attacker, null, "modifier_youlingchuan", {
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
export class modifier_youlingchuan extends BaseModifier {
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
    direction
    start_point

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

        this.max_count = 3

        this.SetDuration(this.max_count * this.tickRate + 1, false)


        this.direction = this.GetCaster().GetForwardVector();
        this.start_point = this.GetCaster().GetAbsOrigin()

        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();

        EmitSoundOnLocationWithCaster(this.caster.GetAbsOrigin(), "Ability.Ghostship.bell", this.caster)
        EmitSoundOnLocationWithCaster(this.caster.GetAbsOrigin(), "Ability.Ghostship", this.caster)
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent();
        this.count++
        if (this.count > this.max_count) {
            this.Destroy()
            return
        }
        let effectName = "particles/units/heroes/hero_kunkka/kunkka_ghost_ship.vpcf";
        let projectile_speed = 650;
        let distance = 1000;
        let direction = parent.GetForwardVector();
        let velocity = direction * projectile_speed as Vector;
        let vSpawnOrigin = parent.GetAbsOrigin();
        let Ability = parent.FindAbilityByName("custom_OnProjectileHit")
        ProjectileManager.CreateLinearProjectile({
            Ability: Ability,
            EffectName: effectName,
            vSpawnOrigin: vSpawnOrigin,
            fDistance: distance,
            // fMaxSpeed:1000,
            // iVisionRadius: 300,
            fStartRadius: 450,
            fEndRadius: 450,
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
        //计算落点aoe
        let end_point = vSpawnOrigin + direction * distance as Vector
        let delay = distance / projectile_speed
        Timers.CreateTimer(delay, () => {
            let enemies = FindUnitsInRadius(
                parent.GetTeamNumber(),
                end_point,
                undefined,
                this.aoe_radius,
                UnitTargetTeam.ENEMY,
                UnitTargetType.HERO + UnitTargetType.BASIC,
                UnitTargetFlags.NONE,
                FindOrder.ANY,
                false
            );
            enemies.forEach(enemy => {
                //计算伤害
                let damage = 100
                ApplyDamage({
                    victim: enemy,
                    attacker: parent,
                    damage: damage,
                    ability: null,
                    damage_type: DamageTypes.MAGICAL,
                    damage_flags: DamageFlag.NONE,
                });
                enemy.AddNewModifier(parent, null, "modifier_stunned", { duration: 1, })
            });
        })
    }
    // If 'true` is returned, projectile would be destroyed.
    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
        // print("OnProjectileHit", modifier_name)
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


