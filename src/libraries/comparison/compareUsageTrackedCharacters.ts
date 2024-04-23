import {Order} from "../order/order";
import {inverse} from "../order/inverse";
import {compareNullable} from "./compareNullable";
import {compareDates, compareNumbers} from "./compareNumbers";
import {UsageInfo} from "../types/qUsageInfo";

export function compareUsageTrackedCharacters(left: UsageInfo, right: UsageInfo): Order {
	// We want the most recently used to be first.
	const lastUsedComparison = compareNullable(
		new Date(left.lastUsed),
		new Date(right.lastUsed),
		(l, r) => inverse(compareDates(l, r)),
	);

	if (lastUsedComparison != Order.Equal) {
		return lastUsedComparison;
	}

	// We want the most used to be before the less used.
	return inverse(compareNumbers(left.useCount, right.useCount));
}
