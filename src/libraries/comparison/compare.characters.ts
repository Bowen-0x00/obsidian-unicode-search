import {Order} from "../order/order";
import {UsageInfo} from "../types/usage-info";
import {compareNullable} from "./compare.nullable";
import {compareStatTrackedCharacters} from "./compare-stat-tracked.characters";
import {compareUnicodeNames} from "./compare-unicode.names";
import {Character} from "../types/character";

export function compareCharacters(left: Character, right: Character): Order {
	const order = compareNullable(
		left as UsageInfo,
		right as UsageInfo,
		(l, r) => compareStatTrackedCharacters(l, r),
	);

	if (order != Order.Equal) {
		return order;
	}

	return compareUnicodeNames(left, right);
}
