import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class huojianpao_swallowable extends BaseAbility {
    GetBehavior(): AbilityBehavior | Uint64 {
        return AbilityBehavior.PASSIVE;
    }

    GetIntrinsicModifierName(): string {
        return modifier_huojianpao_swallowable.name;
    }
}
//吞噬后的技能buff
@registerModifier()
export class modifier_huojianpao_swallowable extends BaseModifier {
    override IsHidden(): boolean {
        if (this.GetAbility()) {
            return true;
        }
        return false;
    }
    GetTexture() {
        return "rattletrap_rocket_flare";
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
                //释放技能
                const targets = FindUnitsInRadius(
                    this.GetParent().GetTeamNumber(), // 敌人的队伍
                    this.GetParent().GetAbsOrigin(), // 敌人的位置
                    undefined, // 查找范围
                    2000, // 查找范围
                    UnitTargetTeam.ENEMY, // 查找敌人
                    UnitTargetType.HERO + UnitTargetType.BASIC, // 查找英雄和小兵
                    UnitTargetFlags.MAGIC_IMMUNE_ENEMIES, // 查找标志，对魔免单位也有效
                    FindOrder.FARTHEST, // 查找顺序
                    false
                );

                if (targets.length > 0) {
                    let target = targets[0]
                    let thinker = CreateModifierThinker(attacker, null, "modifier_huojianpao", {
                        duration: 5,
                        radius: 1000,
                        aoe_radius: 500,
                        damage_int_mult: this.damage_int_mult,
                        damage_frost_mult: this.damage_frost_mult,
                        frost_stack: this.frost_stack,
                        target: target,
                    },
                        target.GetOrigin(),
                        attacker.GetTeamNumber(),
                        false,
                    );
                } else {
                    return
                }

                this.count = 0;
            }
        }
    }
}


@registerModifier()
export class modifier_huojianpao extends BaseModifier {
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

    rocket_particle: ParticleID
    rocket_particless: ParticleID[]

    particleName: string = "particles/econ/items/clockwerk/clockwerk_2022_cc/clockwerk_2022_cc_rocket_flare.vpcf"

    OnCreated(params: any): void {
        if (!IsServer()) return;
        this.caster = this.GetCaster() as CDOTA_BaseNPC_Hero;
        this.damage_int_mult = params.damage_int_mult ?? 0
        this.damage_frost_mult = params.damage_frost_mult ?? 0
        this.damage = this.damage_int_mult * this.caster.GetIntellect(false)
        this.radius = params.radius
        this.aoe_radius = params.aoe_radius
        this.frost_stack = params.frost_stack ?? 0

        this.max_count = 15

        this.tickRate = 0.2;

        this.SetDuration(this.max_count * this.tickRate + 1, false)

        this.particleName = "particles/econ/items/clockwerk/clockwerk_2022_cc/clockwerk_2022_cc_rocket_flare.vpcf"
        // this.particleName = "particles/units/heroes/hero_rattletrap/rattletrap_rocket_flare.vpcf"

        this.rocket_particle = ParticleManager.CreateParticle(this.particleName, ParticleAttachment.CUSTOMORIGIN, this.GetParent())
        ParticleManager.SetParticleControl(this.rocket_particle, 0, this.caster.GetAttachmentOrigin(this.caster.ScriptLookupAttachment("attach_rocket")))
        ParticleManager.SetParticleControl(this.rocket_particle, 1, this.GetParent().GetAbsOrigin())
        ParticleManager.SetParticleControl(this.rocket_particle, 2, Vector(2000, 0, 0))
        this.caster.EmitSound("Hero_Rattletrap.Rocket_Flare.Fire")

        this.rocket_particless = []
        this.rocket_particless.push(this.rocket_particle)

        this.StartIntervalThink(this.tickRate);
    }

    OnIntervalThink() {
        if (!IsServer()) return;
        this.count++
        if (this.count > this.max_count) {
            // this.Destroy()
            return
        }
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
            // let direction = (enemy.GetAbsOrigin() - location as Vector).Normalized()
            // let distance = (enemy.GetAbsOrigin() - location as Vector).Length2D()
            // enemy.SetOrigin(enemy.GetAbsOrigin() - direction * distance * 0.5 as Vector)
            // print("OnIntervalThink", direction * distance)
        });

        let rocket_particle = ParticleManager.CreateParticle("particles/units/heroes/hero_rattletrap/rattletrap_rocket_flare_explosion.vpcf", ParticleAttachment.CUSTOMORIGIN, this.GetParent())
        // ParticleManager.SetParticleControl(rocket_particle, 0, this.caster.GetAttachmentOrigin(this.caster.ScriptLookupAttachment("attach_rocket")))
        ParticleManager.SetParticleControl(rocket_particle, 3, this.GetParent().GetAbsOrigin())
        // ParticleManager.DestroyParticle(rocket_particle, false)
        ParticleManager.ReleaseParticleIndex(rocket_particle)
        EmitSoundOn("Hero_Rattletrap.Rocket_Flare.Explode", this.GetParent())
        // EmitSoundOnLocationWithCaster(vLocation, "Hero_Rattletrap.Rocket_Flare.Explode", self:GetCaster())


        // ParticleManager.DestroyParticle(this.rocket_particle, true)
        // ParticleManager.ReleaseParticleIndex(this.rocket_particle)

        this.rocket_particle = ParticleManager.CreateParticle(this.particleName, ParticleAttachment.CUSTOMORIGIN, this.GetParent())
        ParticleManager.SetParticleControl(this.rocket_particle, 0, this.caster.GetAttachmentOrigin(this.caster.ScriptLookupAttachment("attach_rocket")))
        ParticleManager.SetParticleControl(this.rocket_particle, 1, this.GetParent().GetAbsOrigin())
        ParticleManager.SetParticleControl(this.rocket_particle, 2, Vector(2000, 0, 0))

        this.rocket_particless.push(this.rocket_particle)
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        this.rocket_particless.forEach(rocket_particle => {
            if (rocket_particle) {
                ParticleManager.DestroyParticle(rocket_particle, true)
                // ParticleManager.ReleaseParticleIndex(rocket_particle)
            }
        })

        // if (this.rocket_particle) {
        //     ParticleManager.DestroyParticle(this.rocket_particle, true)
        //     // ParticleManager.ReleaseParticleIndex(this.rocket_particle)
        // }
    }
}


