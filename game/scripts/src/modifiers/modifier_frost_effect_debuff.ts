import { BaseModifier, registerModifier } from "../utils/dota_ts_adapter"

//冰霜效果
@registerModifier()
export class modifier_frost_effect_debuff extends BaseModifier {
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
        return "attr_damage";
    }

    // GetAttributes() {
    //     return ModifierAttribute.MULTIPLE
    // }

    OnCreated(params: object): void {
        let caster = this.GetCaster();
        let parent = this.GetParent();
        let ability = this.GetAbility();
        if (!IsServer()) return;
        this.IncrementStackCount();
    }
    OnRefresh(params: object): void {
        if (!IsServer()) return;
        // if (this.GetStackCount() < this.max_stack_count) {
        //     this.IncrementStackCount();
        // }
        this.IncrementStackCount();
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.ON_TAKEDAMAGE
        ]
    }

    GetEffectName() {
        return "particles/generic_gameplay/generic_slowed_cold.vpcf";
    }
    GetEffectAttachType() {
        return ParticleAttachment.POINT_FOLLOW;
    }
}