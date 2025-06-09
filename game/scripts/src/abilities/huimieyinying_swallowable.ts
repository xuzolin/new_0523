import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class huimieyinying_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_huimieyinying_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_huimieyinying_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "nevermore_shadowraze1";
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
                parent.AddNewModifier(this.GetCaster(), null, "modifier_huimieyinying", {
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
            //概率释放
            // let random = RandomInt(1, 100)
            // if (random <= 15) {
            // if (RollPercentage(15)) {
            if (RollPseudoRandomPercentage(50, PseudoRandom.CUSTOM_GENERIC, attacker)) {
                let direction = attacker.GetForwardVector();
                let origin = attacker.GetAbsOrigin()
                let radius = 150;//点位半径
                let h_direction = RotatePosition(Vector(0, 0, 0), QAngle(0, 90, 0), direction)
                let points: Vector[] = []
                let point1 = origin + direction * radius + h_direction * radius as Vector;
                let point2 = origin + direction * radius + h_direction * radius * -1 as Vector;
                let point3 = origin + direction * radius * 3 + h_direction * radius * 2 as Vector;
                let point4 = origin + direction * radius * 3 + h_direction * radius * 0 as Vector;
                let point6 = origin + direction * radius * 3 + h_direction * radius * -2 as Vector;
                let point7 = origin + direction * radius * 5 + h_direction * radius * 3 as Vector;
                let point8 = origin + direction * radius * 5 + h_direction * radius * 1 as Vector;
                let point9 = origin + direction * radius * 5 + h_direction * radius * -1 as Vector;
                let point10 = origin + direction * radius * 5 + h_direction * radius * -3 as Vector;
                points.push(point1)
                points.push(point2)
                points.push(point3)
                points.push(point4)
                points.push(point6)
                points.push(point7)
                points.push(point8)
                points.push(point9)
                points.push(point10)
                for (const element of points) {
                    let enemies = FindUnitsInRadius(
                        attacker.GetTeamNumber(), // 敌人的队伍
                        element, // 敌人的位置
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
                            attacker: this.GetCaster(),
                            damage: damage,
                            ability: this.GetAbility(),
                            damage_type: DamageTypes.MAGICAL,
                            damage_flags: DamageFlag.NONE,
                        });
             
                    });

                    let nova_pfx = ParticleManager.CreateParticle(
                        "particles/units/heroes/hero_nevermore/nevermore_shadowraze.vpcf",
                        ParticleAttachment.CUSTOMORIGIN, this.GetParent()
                    )
                    ParticleManager.SetParticleControl(nova_pfx, 0, element)
                    ParticleManager.SetParticleControl(nova_pfx, 1, element)
                    ParticleManager.ReleaseParticleIndex(nova_pfx)
                }

                EmitSoundOn("Hero_DeathProphet.CarrionSwarm", attacker)
            }

        }
    }
}