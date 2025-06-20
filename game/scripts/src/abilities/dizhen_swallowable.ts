import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class dizhen_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_dizhen_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_dizhen_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "sandking_epicenter";
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
        // this.StartIntervalThink(this.interval)

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
                600, // 查找范围
                UnitTargetTeam.ENEMY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.CLOSEST, // 查找顺序
                false
            );

            if (targets.length > 0) {
                parent.AddNewModifier(parent, null, "modifier_dizhen", {
                    duration: duration,
                    radius: radius,
                    aoe_radius: aoe_radius,
                    damage_int_mult: this.damage_int_mult,
                    damage_frost_mult: this.damage_frost_mult,
                    frost_stack: this.frost_stack,
                    target: targets[0],

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

    OnAttack(event: ModifierAttackEvent) {
        if (event.attacker == this.GetParent()) {
            let attacker = event.attacker as CDOTA_BaseNPC;
            let target = event.target as CDOTA_BaseNPC;

            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(50, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                let radius = 500;
                //叠加范围
                attacker.AddNewModifier(attacker, null, "modifier_dizhen_stack", { duration: 10, })
                let modifier = attacker.FindModifierByName("modifier_dizhen_stack");
                radius = radius + modifier.GetStackCount() * 20

                let enemies = FindUnitsInRadius(
                    attacker.GetTeamNumber(), // 敌人的队伍
                    attacker.GetAbsOrigin(), // 敌人的位置
                    undefined,
                    radius, // 查找范围
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
                        attacker: attacker,
                        damage: damage,
                        ability: this.GetAbility(),
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
                    enemy.AddNewModifier(attacker, null, "modifier_dizhen_debuff", { duration: 3, })
                });

                let ParticleID = ParticleManager.CreateParticle(
                    "particles/units/heroes/hero_sandking/sandking_epicenter.vpcf",
                    ParticleAttachment.ABSORIGIN_FOLLOW, attacker
                )
                ParticleManager.SetParticleControl(ParticleID, 0, attacker.GetAbsOrigin())
                // // ParticleManager.SetParticleControlEnt(nova_pfx, 0, this.GetParent(), ParticleAttachment.ABSORIGIN, undefined, start_point, true);
                ParticleManager.SetParticleControl(ParticleID, 1, Vector(radius, radius, 1))
                // ParticleManager.SetParticleControl(ParticleID, 2, ent_point)
                ParticleManager.ReleaseParticleIndex(ParticleID)

                // EmitSoundOn("Ability.SandKing_Epicenter.spell", attacker)
                EmitSoundOn("Ability.SandKing_SandStorm.start", attacker)

                Timers.CreateTimer(0.5, () => {
                    let enemies = FindUnitsInRadius(
                        attacker.GetTeamNumber(), // 敌人的队伍
                        attacker.GetAbsOrigin(), // 敌人的位置
                        undefined,
                        radius, // 查找范围
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
                            attacker: attacker,
                            damage: damage,
                            ability: this.GetAbility(),
                            damage_type: DamageTypes.MAGICAL,
                            damage_flags: DamageFlag.NONE,
                        });

                    });

                    let ParticleID = ParticleManager.CreateParticle(
                        "particles/units/heroes/hero_sandking/sandking_epicenter.vpcf",
                        ParticleAttachment.ABSORIGIN_FOLLOW, attacker
                    )
                    ParticleManager.SetParticleControl(ParticleID, 0, attacker.GetAbsOrigin())
                    // // ParticleManager.SetParticleControlEnt(nova_pfx, 0, this.GetParent(), ParticleAttachment.ABSORIGIN, undefined, start_point, true);
                    ParticleManager.SetParticleControl(ParticleID, 1, Vector(radius, radius, 1))
                    // ParticleManager.SetParticleControl(ParticleID, 2, ent_point)
                    ParticleManager.ReleaseParticleIndex(ParticleID)

                })

            }

        }
    }
}

@registerModifier()
export class modifier_dizhen_stack extends BaseModifier {
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
        return false
    }

    GetTexture() {
        return "sandking_epicenter";
    }

    // GetAttributes() {
    //     return ModifierAttribute.MULTIPLE
    // }

    OnCreated(params: object): void {
        // let caster = this.GetCaster();
        // let parent = this.GetParent();
        // let ability = this.GetAbility();
        if (!IsServer()) return;
        // this.IncrementStackCount();
    }
    OnRefresh(params: object): void {
        if (!IsServer()) return;
        // if (this.GetStackCount() < this.max_stack_count) {
        //     this.IncrementStackCount();
        // }
        this.IncrementStackCount();
    }

    // DeclareFunctions(): ModifierFunction[] {
    //     return [
    //         ModifierFunction.ON_TAKEDAMAGE
    //     ]
    // }

    // GetEffectName() {
    //     return "particles/generic_gameplay/generic_slowed_cold.vpcf";
    // }
    // GetEffectAttachType() {
    //     return ParticleAttachment.POINT_FOLLOW;
    // }
}


@registerModifier()
export class modifier_dizhen_debuff extends BaseModifier {
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
        return "sandking_epicenter";
    }

    // GetAttributes() {
    //     return ModifierAttribute.MULTIPLE
    // }

    OnCreated(params: object): void {
        // let caster = this.GetCaster();
        // let parent = this.GetParent();
        // let ability = this.GetAbility();
        if (!IsServer()) return;
        // this.IncrementStackCount();
    }
    OnRefresh(params: object): void {
        if (!IsServer()) return;
        // if (this.GetStackCount() < this.max_stack_count) {
        //     this.IncrementStackCount();
        // }
        // this.IncrementStackCount();
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.ATTACKSPEED_BONUS_CONSTANT
        ]
    }

    GetModifierAttackSpeedBonus_Constant(): number {    
        return -50
    }

    // GetEffectName() {
    //     return "particles/generic_gameplay/generic_slowed_cold.vpcf";
    // }
    // GetEffectAttachType() {
    //     return ParticleAttachment.POINT_FOLLOW;
    // }
}