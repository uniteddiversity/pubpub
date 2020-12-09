import { Node } from 'prosemirror-model';
import { Selection } from 'prosemirror-state';
import { Mapping, Step } from 'prosemirror-transform';

import { DiscussionAnchor } from 'server/models';
import { DiscussionAnchor as DiscussionAnchorType } from 'utils/types';

/**
 * Persists a new anchor for an existing one based on changes to a Prosemirror document.
 * @param anchor an anchor model that will be updated and stored with a later history key
 * @param doc the document that the anchor belongs to (implicitly, with the same history key in some context)
 * @param steps some steps to apply to the document to compute the new anchor position
 * @param the history key that (doc + steps) corresponds to
 */
export const createUpdatedDiscussionAnchorForNewSteps = async (
	anchor: DiscussionAnchorType,
	doc: Node,
	steps: Step[],
	historyKey: number,
) => {
	const { originalText, discussionId, selection: previousSelectionSerialized } = anchor;
	if (!previousSelectionSerialized) {
		return DiscussionAnchor.create({
			historyKey: historyKey,
			discussionId: discussionId,
			originalText: originalText,
			selection: null,
			isOriginal: false,
		});
	}
	const mapping = new Mapping(steps.map((step) => step.getMap()));
	const previousSelection = Selection.fromJSON(doc, previousSelectionSerialized);
	const nextSelection = previousSelection.map(doc, mapping);
	// Even if the resulting selection is empty -- and thus represents a discussion that has become
	// un-anchored -- we still create an anchor to express this information so we don't spend time
	// recalculating it.
	const nextSelectionSerialized = nextSelection.empty ? null : nextSelection.toJSON();
	return DiscussionAnchor.create({
		historyKey: historyKey,
		discussionId: discussionId,
		originalText: originalText,
		selection: nextSelectionSerialized,
		isOriginal: false,
	});
};

export const createOriginalDiscussionAnchor = async ({
	discussionId,
	historyKey,
	selectionJson,
	originalText = '',
	originalTextPrefix = '',
	originalTextSuffix = '',
}: {
	discussionId: string;
	historyKey: number;
	selectionJson: { head: number; anchor: number };
	originalText: string;
	originalTextPrefix?: string;
	originalTextSuffix?: string;
}) => {
	const { head, anchor } = selectionJson;
	DiscussionAnchor.create({
		discussionId: discussionId,
		historyKey: historyKey,
		selection: head === anchor ? null : selectionJson,
		originalText: originalText,
		originalTextPrefix: originalTextPrefix,
		originalTextSuffix: originalTextSuffix,
		isOriginal: true,
	});
};
