import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class touzhifeibiao_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_touzhifeibiao_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_touzhifeibiao_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "bounty_hunter_shuriken_toss";
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
            this.count++
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (this.count >= this.attack_count) {
                //投射物
                let projectile_speed = 1200;
                let distance = 1000;

                // let effectName = "particles/econ/items/drow/drow_arcana/drow_arcana_multishot_linear_proj_frost.vpcf";
                let effectName = "particles/units/heroes/hero_ringmaster/ringmaster_wheel_dagger.vpcf";

                let direction = attacker.GetForwardVector();
                let velocity = direction * projectile_speed as Vector;
                let Ability = attacker.FindAbilityByName("custom_OnProjectileHit")

                let rotate_angle = 15; //旋转角度
                let projectile_num = 5;//投射物数量
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
                this.count = 0;
            }
        }
    }

    // If 'true` is returned, projectile would be destroyed.
    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
        // print("OnProjectileHit", modifier_name)
        if (target) {
            let enemies = FindUnitsInRadius(
                this.GetParent().GetTeamNumber(),
                target.GetAbsOrigin(),
                undefined,
                200,
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
                    attacker: this.GetParent(),
                    damage: damage,
                    ability: null,
                    damage_type: DamageTypes.MAGICAL,
                    damage_flags: DamageFlag.NONE,
                });
            });
        }
        return true
    }
}

@registerModifier()
export class modifier_touzhifeibiao_debuff extends BaseModifier {
    IsHidden(): boolean {
        return false
    }

    IsPurgable(): boolean {
        return false
    }

    RemoveOnDeath(): boolean {
        return true
    }

    IsDebuff(): boolean {
        return true
    }

    GetTexture() {
        return "magnataur_shockwave";
    }

    // GetAttributes() {
    //     return ModifierAttribute.MULTIPLE
    // }

    OnCreated(params: object): void {
        if (!IsServer()) return;
        // this.IncrementStackCount();
    }
    OnRefresh(params: object): void {
        if (!IsServer()) return;
        // if (this.GetStackCount() < this.max_stack_count) {
        //     this.IncrementStackCount();
        // }
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.MOVESPEED_BONUS_PERCENTAGE
        ]
    }

    GetModifierMoveSpeedBonus_Percentage(): number {
        return -75
    }

    // GetEffectName() {
    //     return "particles/generic_gameplay/generic_slowed_cold.vpcf";
    // }
    // GetEffectAttachType() {
    //     return ParticleAttachment.POINT_FOLLOW;
    // }
}