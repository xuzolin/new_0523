import { BaseAbility, BaseModifier, registerAbility, registerModifier } from '../utils/dota_ts_adapter';
import { GetAbilityCooldown, GetAbilityValues } from '../utils/tstl-utils';

@registerAbility()
export class custom_OnProjectileHit extends BaseAbility {
    OnProjectileHit_ExtraData(target: CDOTA_BaseNPC, location: Vector, ExtraData: any) {
        if (!IsServer()) return;
        // print(location)
        // DeepPrintTable(ExtraData)
        ApplyDamage({
            attacker: this.GetCaster(),
            victim: target,
            damage: 100,
            damage_type: DamageTypes.MAGICAL,
            ability: this,
        });
    }
}
