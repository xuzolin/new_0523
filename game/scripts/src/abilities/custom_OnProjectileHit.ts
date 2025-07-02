import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

declare global {
    interface CDOTA_Buff {
        OnProjectileHit?: (target: CDOTA_BaseNPC | undefined, modifier_name?: string) => boolean;
    }
}

@registerAbility()
export class custom_OnProjectileHit extends BaseAbility {
    OnProjectileHit_ExtraData(target: CDOTA_BaseNPC, location: Vector, ExtraData: any) {
        if (!IsServer()) return;
        let modifier_name = ExtraData.name;
        let attacker = this.GetCaster();
        // print(location)
        // DeepPrintTable(ExtraData)
        // ApplyDamage({
        //     attacker: attacker,
        //     victim: target,
        //     damage: 100,
        //     damage_type: DamageTypes.MAGICAL,
        //     ability: this,
        // });

        if (modifier_name) {
            let modifier = attacker.FindModifierByName(modifier_name)
            if (modifier && modifier.OnProjectileHit) {
                return modifier.OnProjectileHit(target, modifier_name)
            }
        }
    }
}
