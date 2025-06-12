import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class taixuzhen_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_taixuzhen_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_taixuzhen_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "juggernaut_omni_slash";
        // return "attr_damage";
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
            const targets = FindUnitsInRadius(
                this.GetParent().GetTeamNumber(), // 敌人的队伍
                this.GetParent().GetAbsOrigin(), // 敌人的位置
                undefined, // 查找范围
                1000, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.CLOSEST, // 查找顺序
                false
            );

            if (targets.length > 0) {
                // print("targets", targets[0].GetUnitName())
                parent.AddNewModifier(this.GetCaster(), null, "modifier_taixuzhen", {
                    duration: duration,
                    radius: radius,
                    aoe_radius: aoe_radius,
                    damage_int_mult: this.damage_int_mult,
                    damage_frost_mult: this.damage_frost_mult,
                    frost_stack: this.frost_stack,
                    target_ent: targets[0].entindex(),
                });
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
}

// 技能效果
@registerModifier()
export class modifier_taixuzhen extends BaseModifier {
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
        return "juggernaut_omni_slash";
    }
    private caster: CDOTA_BaseNPC_Hero
    private damage: number;
    private damage_int_mult: number;
    private damage_frost_mult: number;
    private frost_stack: number;

    private radius: number;
    private aoe_radius: number;
    private tickRate: number;
    private target_ent: EntityIndex;

    private caster_origin: Vector;
    private center_point: Vector;
    private hit_count = 0;
    private points = {};
    private count = 5;
    private orders = [1, 4, 2, 5, 3, 1];


    OnCreated(params: any): void {
        if (!IsServer()) return;
        this.caster = this.GetCaster() as CDOTA_BaseNPC_Hero;
        this.damage_int_mult = params.damage_int_mult ?? 0
        this.damage_frost_mult = params.damage_frost_mult ?? 0
        // this.damage = this.damage_int_mult * this.caster.GetIntellect(false)
        this.damage = 100
        this.radius = params.radius
        this.aoe_radius = params.aoe_radius
        this.frost_stack = params.frost_stack ?? 0

        this.target_ent = params.target_ent

        this.tickRate = 0.2

        // const particleId2 = ParticleManager.CreateParticle(
        //     "particles/units/heroes/hero_lich/lich_ice_age.vpcf",
        //     ParticleAttachment.ABSORIGIN_FOLLOW,
        //     this.GetParent()
        // );
        // ParticleManager.SetParticleControlEnt(particleId2, 1, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // // ParticleManager.SetParticleControl(particleId2, 0, this.GetParent().GetAbsOrigin());
        // // ParticleManager.SetParticleControl(particleId2, 1, this.GetParent().GetAbsOrigin());
        // ParticleManager.SetParticleControl(particleId2, 2, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
        // this.AddParticle(particleId2, false, false, -1, false, false)

        //五角星顶点坐标
        this.center_point = EntIndexToHScript(this.target_ent).GetAbsOrigin()
        let originalPoint = this.center_point + this.caster.GetForwardVector() * this.aoe_radius as Vector
        for (let i = 1; i <= this.count; i++) {
            this.points[i] = RotatePosition(this.center_point, QAngle(0, 360 / this.count * i, 0), originalPoint) as Vector
        }
        // print(middle)
        // print(direction)
        // DeepPrintTable(this.points)
        this.caster_origin = this.caster.GetOrigin()

        this.GetParent().Stop()
        this.caster.SetOrigin(this.points[1])


        this.StartIntervalThink(this.tickRate);
        // this.OnIntervalThink();
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        this.hit_count++
        // print("this.hit_count", this.hit_count)
        if (this.hit_count > this.count) {
            this.caster.SetOrigin(this.caster_origin)
            let ParticleID = ParticleManager.CreateParticle(
                "particles/units/heroes/hero_void_spirit/dissimilate/void_spirit_dissimilate_dmg.vpcf",
                ParticleAttachment.ABSORIGIN, this.caster
            )
            ParticleManager.SetParticleControl(ParticleID, 0, this.center_point)
            ParticleManager.SetParticleControl(ParticleID, 1, Vector(this.aoe_radius * 0.71, this.aoe_radius * 0.71, 0))
            ParticleManager.ReleaseParticleIndex(ParticleID)

            let enemies = FindUnitsInRadius(
                this.GetCaster().GetTeamNumber(), //队伍
                this.center_point, // 敌人的位置
                undefined,
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
                let damage = this.damage + enemy.GetModifierStackCount("modifier_frost_effect_debuff", this.GetCaster()) * this.damage_frost_mult
                ApplyDamage({
                    victim: enemy,
                    attacker: this.GetCaster(),
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.MAGICAL,
                    damage_flags: DamageFlag.NONE,
                });
            });

            this.Destroy()
            return;
        }
        let target_point = this.points[this.orders[this.hit_count]]
        let hit_pfx = ParticleManager.CreateParticle("particles/units/heroes/hero_void_spirit/astral_step/void_spirit_astral_step.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW, this.caster
        )
        ParticleManager.SetParticleControl(hit_pfx, 0, this.caster.GetOrigin())
        ParticleManager.SetParticleControl(hit_pfx, 1, target_point)
        ParticleManager.ReleaseParticleIndex(hit_pfx)
        this.GetParent().EmitSound("Hero_VoidSpirit.AstralStep.Start")
        // if (this.hit_count == this.count) {
        //     let ParticleID1 = ParticleManager.CreateParticle("particles/units/heroes/hero_void_spirit/dissimilate/void_spirit_dissimilate.vpcf",
        //         ParticleAttachment.ABSORIGIN, this.caster
        //     )
        //     ParticleManager.SetParticleControl(ParticleID1, 0, this.center_point)
        //     ParticleManager.SetParticleControl(ParticleID1, 1, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius))
        //     ParticleManager.ReleaseParticleIndex(ParticleID1)
        // }
        let units = FindUnitsInLine(
            this.caster.GetTeamNumber(),
            this.caster.GetOrigin(),
            target_point,
            undefined,
            150,
            UnitTargetTeam.ENEMY,
            UnitTargetType.HERO + UnitTargetType.BASIC,
            UnitTargetFlags.NONE,
        )
        for (let unit of units) {
            let damage = 100
            ApplyDamage({
                victim: unit,
                attacker: this.GetCaster(),
                damage: damage,
                ability: this.GetAbility(),
                damage_type: DamageTypes.MAGICAL,
                damage_flags: DamageFlag.NONE,
            });
        }
        this.caster.SetOrigin(target_point)
    }

    CheckState() {
        return {
            [ModifierState.UNSELECTABLE]: true,
            [ModifierState.COMMAND_RESTRICTED]: true,
            [ModifierState.NO_UNIT_COLLISION]: true,
            [ModifierState.INVULNERABLE]: true,
            [ModifierState.NO_HEALTH_BAR]: true,
            [ModifierState.MAGIC_IMMUNE]: true,
        };
    }
}
