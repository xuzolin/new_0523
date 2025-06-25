import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class liehuochilun_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_liehuochilun_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_liehuochilun_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "shredder_chakram";
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

    // DeclareFunctions() {
    //     return [
    //         // ModifierFunction.ON_ATTACK_LANDED,
    //         ModifierFunction.ON_ATTACK,
    //     ];
    // }

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
        // print("cd_remaining", this.cd_remaining)
        if (this.cd_remaining <= 0 && parent.IsAlive()) {
            let spirit_count = 1
            let caster_pos = parent.GetOrigin();
            let direction = parent.GetForwardVector();

            for (let i = 1; i <= spirit_count; i++) {
                // let spirit = CreateUnitByName("npc_dummy_unit", parent.GetAbsOrigin(), false, parent, parent, parent.GetTeam())
                // spirit.SetControllableByPlayer(parent.GetPlayerOwnerID(), false)
                // spirit.AddNewModifier(parent, null, "modifier_liehuochilun", {
                //     duration: duration,
                //     radius: 100,
                //     angle_offset: (i - 1) * (2 * math.pi / spirit_count),//-- 均匀分布角度
                // })

                // 计算每个粒子的角度（均匀分布）初始角度
                let angle = (i - 1) * (2 * Math.PI / spirit_count);

                let h_direction = RotatePosition(Vector(0, 0, 0), QAngle(0, (i - 1) * (360 / spirit_count), 0), direction)

                let Thinker = CreateModifierThinker(parent, null, "modifier_liehuochilun", {
                    duration: duration,
                    radius: 100,
                    angle_offset: angle - VectorToAngles(direction).y * 3.14 / 180,
                    // original_direction: h_direction,
                    x: h_direction.x,
                    y: h_direction.y,
                },
                    parent.GetOrigin(),
                    parent.GetTeamNumber(),
                    false,
                );
            }

            parent.EmitSound("Hero_Shredder.Chakram.Cast")

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
    //                     attacker: attacker,
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

@registerModifier()
export class modifier_liehuochilun extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "doom_bringer_infernal_blade";
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
    angle_offset
    current_radius
    rotation_speed
    aoe_radius
    units: CDOTA_BaseNPC[]
    particleId: ParticleID

    isInPos = false

    original_direction: Vector
    override OnCreated(params: AnyTable): void {
        if (!IsServer()) return;
        this.units = []
        // this.angle_offset = 180
        this.angle_offset = params.angle_offset
        this.current_radius = 500  // 初始半径
        this.rotation_speed = 0.2  // 旋转角速度（弧度/帧）一周 2π/时间 

        this.aoe_radius = 300

        this.original_direction = Vector(params.x, params.y, 0)

        // this.original_direction = this.GetCaster().GetForwardVector()

        // particles/units/heroes/hero_shredder/shredder_chakram.vpcf
        // particles/econ/items/shredder/hero_shredder_icefx/shredder_chakram_ice.vpcf
        // particles/econ/items/shredder/hero_shredder_icefx/shredder_chakram_stay_ice.vpcf
        // particles/units/heroes/hero_shredder/shredder_chakram_stay.vpcf
        this.particleId = ParticleManager.CreateParticle(
            "particles/units/heroes/hero_shredder/shredder_chakram_stay.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent()
        );
        ParticleManager.SetParticleControlEnt(this.particleId, 0, this.GetParent(), ParticleAttachment.ABSORIGIN_FOLLOW, undefined, this.GetParent().GetAbsOrigin(), true);
        // ParticleManager.SetParticleControl(this.particleId, 0, this.GetParent().GetAbsOrigin());
        ParticleManager.SetParticleControl(this.particleId, 1, Vector(this.aoe_radius, this.aoe_radius, this.aoe_radius));
        this.AddParticle(this.particleId, false, false, -1, false, false)

        // //初始位置=施法者朝向
        // this.GetParent().SetAbsOrigin(this.GetCaster().GetAbsOrigin() + this.GetCaster().GetForwardVector() * this.current_radius as Vector)

        this.StartIntervalThink(FrameTime())

        // print("OnCreated", this.damage_int_mult)
        // print("OnCreated", this.damage_frost_mult)
        // print("OnCreated", this.frost_stack)
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        let parent = this.GetParent()
        let caster = this.GetCaster()
        let caster_pos = caster.GetAbsOrigin()
        if (this.isInPos == false) {
            //向前运动
            let new_pos = parent.GetOrigin() + this.original_direction * 2000 * 0.03 as Vector
            parent.SetAbsOrigin(GetGroundPosition(new_pos, null))
            if ((parent.GetAbsOrigin() - caster_pos as Vector).Length2D() >= this.current_radius) {
                this.isInPos = true
            }
        } else {
            // // -- === 运动逻辑 ===
            // // --计算新位置（围绕施法者旋转）
            // this.angle_offset = this.angle_offset - this.rotation_speed
            // let new_pos = caster_pos + Vector(
            //     math.cos(this.angle_offset) * this.current_radius,
            //     math.sin(this.angle_offset) * this.current_radius,
            //     0
            // ) as Vector
            // parent.SetAbsOrigin(new_pos)

            const rotationAngle = QAngle(0, 12, 0); //角度
            const rotatedPoint = RotatePosition(caster_pos, rotationAngle, parent.GetAbsOrigin());
            parent.SetAbsOrigin(GetGroundPosition(rotatedPoint, null))

        }



        let enemies = FindUnitsInRadius(
            caster.GetTeamNumber(), // 敌人的队伍
            parent.GetAbsOrigin(), // 敌人的位置
            undefined,
            this.aoe_radius, // 查找范围
            UnitTargetTeam.ENEMY, // 查找敌人
            UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
            UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
            FindOrder.CLOSEST, // 查找顺序
            false
        )

        // -- === 伤害逻辑 === 
        // 对每个新敌人造成伤害
        enemies.forEach(enemy => {
            if (this.units.includes(enemy) == false) {
                //计算伤害
                let damage = 100
                ApplyDamage({
                    victim: enemy,
                    attacker: caster,
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.MAGICAL,
                    damage_flags: DamageFlag.NONE,
                });
                this.units.push(enemy)
            }
        });


    }

}

