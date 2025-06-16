import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class yunshi_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_yunshi_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_yunshi_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "invoker_chaos_meteor";
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

    DeclareFunctions() {
        return [
            // ModifierFunction.ON_ATTACK_LANDED,
            ModifierFunction.ON_ATTACK,
        ];
    }
    Thinkers: CDOTA_BaseNPC[] = []
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
                1200, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.CLOSEST, // 查找顺序
                false
            );

            if (targets.length > 0) {
                let target = targets[0]
                // let Thinker = CreateModifierThinker(parent, null, "modifier_yunshi", {
                //     duration: duration,
                //     radius: radius,
                //     aoe_radius: aoe_radius,
                //     damage_int_mult: this.damage_int_mult,
                //     damage_frost_mult: this.damage_frost_mult,
                //     frost_stack: this.frost_stack,
                //     target: target,
                // },
                //     target.GetOrigin(),
                //     parent.GetTeamNumber(),
                //     false,
                // );
                let count = 6
                let projectile_speed = 500;
                let distance = 1000;

                let effectName = "particles/units/heroes/hero_invoker/invoker_chaos_meteor.vpcf";
                let Ability = parent.FindAbilityByName("custom_OnProjectileHit")
                let ori_direction = parent.GetForwardVector();
                let tagetOrigin = target.GetAbsOrigin()
                //下落
                let vSpawnOrigin = parent.GetAbsOrigin()
                vSpawnOrigin.z += 500
                let ParticleID = ParticleManager.CreateParticle(
                    "particles/units/heroes/hero_invoker/invoker_chaos_meteor_fly.vpcf",
                    ParticleAttachment.ABSORIGIN, target
                )
                ParticleManager.SetParticleControl(ParticleID, 0, vSpawnOrigin)
                ParticleManager.SetParticleControl(ParticleID, 1, tagetOrigin)
                ParticleManager.SetParticleControl(ParticleID, 2, Vector(1, 0, 0))
                ParticleManager.SetParticleControl(ParticleID, 4, Vector(10, 10, 10))
                ParticleManager.ReleaseParticleIndex(ParticleID)
                parent.EmitSound("Hero_Invoker.ChaosMeteor.Cast")

                Timers.CreateTimer(1, () => {
                    // let Thinker = CreateModifierThinker(parent, null, null, { duration: 1, },
                    //     target.GetOrigin(),
                    //     parent.GetTeamNumber(),
                    //     false,
                    // );
                    target.EmitSound("Hero_Invoker.ChaosMeteor.Impact")
                    for (let i = 1; i <= count; i++) {
                        let angle = (i - 1) * (360 / count);
                        let qAngles = VectorToAngles(ori_direction)
                        qAngles.y += angle
                        let direction = AnglesToVector(qAngles)
                        let velocity = direction * projectile_speed as Vector;
                        // print("Ability", Ability.GetAbilityName())
                        ProjectileManager.CreateLinearProjectile({
                            Ability: Ability,
                            EffectName: effectName,
                            vSpawnOrigin: tagetOrigin,
                            fDistance: distance,
                            // fMaxSpeed:1000,
                            // iVisionRadius: 300,
                            fStartRadius: 100,
                            fEndRadius: 150,
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
                    }
                })

                EmitSoundOn("Hero_DeathProphet.CarrionSwarm", parent)
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

    // OnAttack(event: ModifierAttackEvent) {
    //     if (event.attacker == this.GetParent()) {
    //         let attacker = event.attacker as CDOTA_BaseNPC;
    //         let target = event.target as CDOTA_BaseNPC;

    //         //概率释放
    //         // let random = RandomInt(1, 100)
    //         // if (random <= 15) {
    //         // if (RollPercentage(15)) {
    //         if (RollPseudoRandomPercentage(50, PseudoRandom.CUSTOM_GENERIC, attacker)) {
    //             let radius = 500;
    //             let enemies = FindUnitsInRadius(
    //                 attacker.GetTeamNumber(), // 敌人的队伍
    //                 target.GetAbsOrigin(), // 敌人的位置
    //                 undefined,
    //                 radius, // 查找范围
    //                 UnitTargetTeam.ENEMY, // 查找敌人
    //                 UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
    //                 UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
    //                 FindOrder.CLOSEST, // 查找顺序
    //                 false
    //             )
    //             // 对每个敌人造成伤害
    //             enemies.forEach(enemy => {
    //                 //计算伤害
    //                 let damage = 100
    //                 ApplyDamage({
    //                     victim: enemy,
    //                     attacker: this.GetCaster(),
    //                     damage: damage,
    //                     ability: this.GetAbility(),
    //                     damage_type: DamageTypes.MAGICAL,
    //                     damage_flags: DamageFlag.NONE,
    //                 });

    //             });

    //             let ParticleID = ParticleManager.CreateParticle(
    //                 "particles/units/heroes/hero_doom_bringer/doom_bringer_lvl_death.vpcf",
    //                 ParticleAttachment.POINT_FOLLOW, target
    //             )
    //             // ParticleManager.SetParticleControl(ParticleID, 0, start_point)
    //             // // ParticleManager.SetParticleControlEnt(nova_pfx, 0, this.GetParent(), ParticleAttachment.ABSORIGIN, undefined, start_point, true);
    //             // ParticleManager.SetParticleControl(ParticleID, 1, ent_point)
    //             // ParticleManager.SetParticleControl(ParticleID, 2, ent_point)
    //             ParticleManager.ReleaseParticleIndex(ParticleID)

    //             EmitSoundOn("Hero_DeathProphet.CarrionSwarm", attacker)
    //         }

    //     }
    // }
}

// 技能效果
@registerModifier()
export class modifier_yunshi extends BaseModifier {
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

        this.damageTable = {
            victim: this.GetParent(),
            attacker: this.GetCaster(),
            damage: this.damage,
            ability: this.GetAbility(),
            damage_type: DamageTypes.MAGICAL,
            damage_flags: DamageFlag.NONE,
        };

        const particleId = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_enigma/enigma_blackhole.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent()
        );
        // ParticleManager.SetParticleControl(particleId, 0, this.GetParent().GetAbsOrigin());
        ParticleManager.SetParticleControlEnt(particleId, 0, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        ParticleManager.SetParticleControl(particleId, 1, Vector(this.radius, this.radius, this.radius));
        this.AddParticle(particleId, false, false, -1, false, false)




        this.StartIntervalThink(this.tickRate);
        this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
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
            let direction = (enemy.GetAbsOrigin() - location as Vector).Normalized()
            let distance = (enemy.GetAbsOrigin() - location as Vector).Length2D()
            enemy.SetOrigin(enemy.GetAbsOrigin() - direction * distance * 0.5 as Vector)
            // print("OnIntervalThink", direction * distance)
        });
    }

    // 光环
    IsAura() { return true; }
    GetModifierAura() { return "modifier_yunshi_aura_debuff"; }
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


