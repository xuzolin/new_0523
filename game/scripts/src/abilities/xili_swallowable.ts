import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class xili_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_xili_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_xili_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "omniknight_purification";
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
            if (parent) {
                parent.Heal(100, null)

                let enemies = FindUnitsInRadius(
                    this.GetCaster().GetTeamNumber(), // 敌人的队伍
                    parent.GetAbsOrigin(), // 敌人的位置
                    undefined, // 查找范围
                    aoe_radius, // 查找范围
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
                        attacker: parent,
                        damage: damage,
                        ability: this.GetAbility(),
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
                });

                let particle_aoe_fx = ParticleManager.CreateParticle("particles/units/heroes/hero_omniknight/omniknight_purification.vpcf",
                    ParticleAttachment.ABSORIGIN_FOLLOW, parent)
                ParticleManager.SetParticleControl(particle_aoe_fx, 0, parent.GetAbsOrigin())
                ParticleManager.SetParticleControl(particle_aoe_fx, 1, Vector(aoe_radius, aoe_radius, aoe_radius))
                ParticleManager.ReleaseParticleIndex(particle_aoe_fx)
            }



            let friends = FindUnitsInRadius(
                parent.GetTeamNumber(), // 敌人的队伍
                parent.GetAbsOrigin(), // 敌人的位置
                undefined, // 查找范围
                500, // 查找范围
                UnitTargetTeam.FRIENDLY, // 查找敌人
                UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                FindOrder.ANY, // 查找顺序
                false
            )

            friends = friends.filter((friend) => {
                return friend != parent

            })

            if (friends[0]) {
                friends[0].Heal(100, null)
                
                let enemiess = FindUnitsInRadius(
                    parent.GetTeamNumber(), // 敌人的队伍
                    friends[0].GetAbsOrigin(), // 敌人的位置
                    undefined, // 查找范围
                    aoe_radius, // 查找范围
                    UnitTargetTeam.ENEMY, // 查找敌人
                    UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                    UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                    FindOrder.CLOSEST, // 查找顺序
                    false
                )
                // 对每个敌人造成伤害
                enemiess.forEach(enemy => {
                    //计算伤害
                    let damage = 100
                    ApplyDamage({
                        victim: enemy,
                        attacker: parent,
                        damage: damage,
                        ability: this.GetAbility(),
                        damage_type: DamageTypes.MAGICAL,
                        damage_flags: DamageFlag.NONE,
                    });
                });
                let particle_aoe_fx = ParticleManager.CreateParticle("particles/units/heroes/hero_omniknight/omniknight_purification.vpcf",
                    ParticleAttachment.ABSORIGIN_FOLLOW, friends[0])
                ParticleManager.SetParticleControl(particle_aoe_fx, 0, friends[0].GetAbsOrigin())
                ParticleManager.SetParticleControl(particle_aoe_fx, 1, Vector(aoe_radius, aoe_radius, aoe_radius))
                ParticleManager.ReleaseParticleIndex(particle_aoe_fx)
            }


            parent.EmitSound("Hero_Omniknight.Repel")


            //重置cd
            this.cd_remaining = cd
            if (this.GetAbility()) {
                this.GetAbility().StartCooldown(cd)
            }
        }
    }
}