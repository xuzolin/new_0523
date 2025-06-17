import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class shujianqifa_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_shujianqifa_swallowable_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_shujianqifa_swallowable_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "drow_ranger_multishot";
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
            if (RollPseudoRandomPercentage(50, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                //投射物
                let projectile_speed = 1200;
                let distance = 1000;

                // let effectName = "particles/units/heroes/hero_drow/drow_multishot_proj_linear_proj.vpcf";
                let effectName = "particles/econ/items/windrunner/windranger_arcana/windranger_arcana_spell_powershot.vpcf";

                let direction = attacker.GetForwardVector();
                let velocity = direction * projectile_speed as Vector;
                let Ability = attacker.FindAbilityByName("custom_OnProjectileHit")

                let rotate_angle = 15; //旋转角度
                let projectile_num = 6;//投射物数量
                for (let i = 0; i < projectile_num; i++) {
                    //*根据数量以前方为中心左右旋转固定角度 = (i-1) * rotate_angle - (projectile_num - 1) * rotate_angle / 2
                    let _vDirection = RotatePosition(Vector(0, 0, 0), QAngle(0, ((projectile_num - 1) * rotate_angle / 2 - i * rotate_angle), 0), direction);
                    velocity = _vDirection * projectile_speed as Vector;
                    ProjectileManager.CreateLinearProjectile({
                        Ability: Ability,
                        EffectName: effectName,
                        vSpawnOrigin: attacker.GetAbsOrigin(),
                        fDistance: distance,
                        // fMaxSpeed:1000,
                        // iVisionRadius: 300,
                        fStartRadius: 100,
                        fEndRadius: 100,
                        Source: attacker,
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
                }
                attacker.EmitSound("Hero_DrowRanger.Multishot.Attack")
            }

        }
    }
}


