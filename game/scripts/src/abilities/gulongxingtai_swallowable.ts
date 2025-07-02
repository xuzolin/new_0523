import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class gulongxingtai_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_gulongxingtai_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_gulongxingtai_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "dragon_knight_elder_dragon_form";
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
            parent.AddNewModifier(parent, null, "modifier_gulongxingtai", {
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
export class modifier_gulongxingtai extends BaseModifier {
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
        return "dragon_knight_elder_dragon_form";
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

    previous_attack_cability: UnitAttackCapability
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


        // this.StartIntervalThink(this.tickRate);
        // this.OnIntervalThink();

        this.previous_attack_cability = this.GetParent().GetAttackCapability()
        this.GetParent().SetAttackCapability(UnitAttackCapability.RANGED_ATTACK)
        let transform_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_dragon_knight/dragon_knight_transform_red.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent())
        ParticleManager.ReleaseParticleIndex(transform_particle)

        let particle_ally_fx = ParticleManager.CreateParticle("particles/units/heroes/hero_terrorblade/terrorblade_metamorphosis.vpcf",
            ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent())
        ParticleManager.SetParticleControl(particle_ally_fx, 0, this.GetParent().GetAbsOrigin())
        this.AddParticle(particle_ally_fx, false, false, -1, false, false)
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        this.GetParent().SetAttackCapability(this.previous_attack_cability)
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

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.MODEL_CHANGE,
            ModifierFunction.TRANSLATE_ATTACK_SOUND,
            ModifierFunction.PROJECTILE_NAME,
            // ModifierFunction.ATTACK_RANGE_BASE_OVERRIDE,
            ModifierFunction.ATTACK_RANGE_BONUS,

            // ModifierFunction.DAMAGEOUTGOING_PERCENTAGE,
            // ModifierFunction.ATTACKSPEED_PERCENTAGE,
            ModifierFunction.MOVESPEED_BONUS_CONSTANT,
            ModifierFunction.ON_ATTACK,
            ModifierFunction.ON_ATTACK_LANDED,


            // ModifierFunction.ABSORB_SPELL,

        ]
    }

    GetModifierModelChange() {
        // return "models/heroes/terrorblade/demon.vmdl"
        return "models/items/dragon_knight/aurora_warrior_set_dragon_style2_aurora_warrior_set/aurora_warrior_set_dragon_style2_aurora_warrior_set.vmdl"
    }

    GetAttackSound() {
        return "Hero_Terrorblade_Morphed.Attack"
    }

    GetModifierProjectileName() {
        // return "particles/units/heroes/hero_terrorblade/terrorblade_metamorphosis_base_attack.vpcf"
        return "particles/units/heroes/hero_dragon_knight/dragon_knight_elder_dragon_attack_black.vpcf"
    }

    GetModifierAttackRangeBonus(): number {
        return 600
    }

    // GetModifierDamageOutgoing_Percentage(): number {
    //     return 100
    // }

    GetModifierMoveSpeedBonus_Constant(): number {
        return 20
    }

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            let target = event.target as CDOTA_BaseNPC;
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            let projectile_speed = 1000;
            let Ability = attacker.FindAbilityByName("custom_OnProjectileHit");
            let effectName = "particles/units/heroes/hero_dragon_knight/dragon_knight_elder_dragon_attack_black.vpcf"
            let attack_range = 600
            let count = 1
            if (attacker.IsRangedAttacker()) {
                projectile_speed = attacker.GetProjectileSpeed()
                attack_range = attacker.Script_GetAttackRange()
            }
            let targets = FindUnitsInRadius(
                this.GetParent().GetTeamNumber(), // 敌人的队伍
                this.GetParent().GetAbsOrigin(), // 敌人的位置
                undefined, // 查找范围
                attack_range, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.CLOSEST, // 查找顺序
                false
            );

            targets = targets.filter(unit => {
                return unit != target
            })

            for (let i = 0; i < count; i++) {
                let enemy = targets[i];
                if (enemy) {
                    ProjectileManager.CreateTrackingProjectile(
                        {
                            EffectName: effectName,
                            Ability: Ability,
                            Source: attacker,
                            bProvidesVision: false,
                            iVisionRadius: 0,
                            // iVisionTeamNumber: DOTATeam_t,
                            vSourceLoc: attacker.GetOrigin(),
                            Target: enemy,
                            iMoveSpeed: projectile_speed,
                            flExpireTime: GameRules.GetGameTime() + 10,
                            bDodgeable: false,
                            bIsAttack: false,

                            ExtraData: {
                                name: this.GetName(),
                                danage: 100,
                                damage_type: DamageTypes.MAGICAL,
                            },
                        }
                    )
                }
            }
        }
    }


    OnAttackLanded(event: ModifierAttackEvent) {
        if (!IsServer()) return;
        if (event.attacker != this.GetParent()) return;
        if (event.target.GetTeamNumber() == this.GetParent().GetTeamNumber()) return;
        if (event.target.IsBuilding()) return;
        if (event.target.IsMagicImmune()) return;

        let enemies = FindUnitsInRadius(
            this.GetParent().GetTeamNumber(),
            event.target.GetAbsOrigin(),
            undefined,
            200,
            UnitTargetTeam.ENEMY,
            UnitTargetType.HERO + UnitTargetType.BASIC,
            UnitTargetFlags.NONE,
            FindOrder.ANY,
            false
        );
        // let damage = this.damage + this.damage_frost_mult * this.frost_stack
        let damage = this.GetParent().GetAverageTrueAttackDamage(null) / 2
        enemies.forEach(enemy => {
            if (enemy != event.target) {
                ApplyDamage({
                    victim: enemy,
                    attacker: this.GetParent(),
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.PHYSICAL,
                    damage_flags: DamageFlag.NONE,
                });
            }
        });


        let ParticleID = ParticleManager.CreateParticle("particles/units/heroes/hero_dragon_knight/dragon_knight_transform_black.vpcf",
            ParticleAttachment.CUSTOMORIGIN, this.GetParent())
        ParticleManager.SetParticleControl(ParticleID, 1, event.target.GetAbsOrigin())
        ParticleManager.ReleaseParticleIndex(ParticleID)

    }

    OnProjectileHit = (target: CDOTA_BaseNPC | undefined, modifier_name?: string): boolean => {
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
            // let damage = this.damage + this.damage_frost_mult * this.frost_stack
            // let damage = this.GetParent().GetAttackDamage()
            let damage = this.GetParent().GetAverageTrueAttackDamage(null)
            enemies.forEach(enemy => {
                ApplyDamage({
                    victim: enemy,
                    attacker: this.GetParent(),
                    damage: damage,
                    ability: this.GetAbility(),
                    damage_type: DamageTypes.PHYSICAL,
                    damage_flags: DamageFlag.NONE,
                });

            });

            let ParticleID = ParticleManager.CreateParticle("particles/units/heroes/hero_dragon_knight/dragon_knight_transform_black.vpcf",
                ParticleAttachment.CUSTOMORIGIN, this.GetParent())
            ParticleManager.SetParticleControl(ParticleID, 1, target.GetAbsOrigin())
            ParticleManager.ReleaseParticleIndex(ParticleID)
        }
        return false
    }


    // GetAbsorbSpell() {
    //     return 0 as 0 | 1;
    // }



}